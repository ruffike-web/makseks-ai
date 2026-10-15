import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readAIConfig, saveAIConfig } from "../src/lib/ai-config";
import { createExtractionProvider } from "../src/lib/extraction";
import { blankInvoice } from "../src/lib/domain";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function setup() {
  const file = join(mkdtempSync(join(tmpdir(), "providers-")), "ai.json");
  vi.stubEnv("ARVE_AI_CONFIG_FILE", file);
  vi.stubEnv("GEMINI_API_KEY", "gemini-secret");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  return file;
}
it("migrates legacy Gemini config and isolates provider keys", async () => {
  const file = setup();
  writeFileSync(
    file,
    JSON.stringify({ apiKey: "old-gemini", model: "gemini-test" }),
  );
  (await saveAIConfig({ provider: "openai", model: "gpt-4.1" }));
  expect((await readAIConfig()).apiKey).toBe("");
  (await saveAIConfig({
    provider: "openai",
    model: "gpt-4.1",
    apiKey: "openai-secret",
  }));
  (await saveAIConfig({ provider: "gemini", model: "gemini-test" }));
  expect((await readAIConfig()).apiKey).toBe("old-gemini");
});
for (const provider of ["openai", "anthropic"] as const)
  for (const mime of ["application/pdf", "image/png"]) {
    it(`${provider} sends ${mime} with only its key and validates structured output`, async () => {
      setup();
      (await saveAIConfig({
        provider,
        model: provider === "openai" ? "gpt-6.1-sol" : "claude-sonnet-5-5",
        apiKey: `${provider}-secret`,
      }));
      const output = blankInvoice();
      const fetchMock = vi.fn().mockResolvedValue(
        Response.json(
          provider === "openai"
            ? {
                status: "completed",
                output: [
                  {
                    type: "message",
                    content: [
                      { type: "output_text", text: JSON.stringify(output) },
                    ],
                  },
                ],
              }
            : {
                stop_reason: "tool_use",
                content: [
                  { type: "tool_use", name: "invoice_fields", input: output },
                ],
              },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);
      const result = await createExtractionProvider().extract({
        mime,
        bytes: Buffer.from("test-document"),
      });
      expect(result.amountDue).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain(
        provider === "openai" ? "api.openai.com" : "api.anthropic.com",
      );
      expect(JSON.stringify(init.headers)).toContain(`${provider}-secret`);
      expect(JSON.stringify(init)).not.toContain("gemini-secret");
      const body = JSON.parse(init.body);
      if (provider === "openai") {
        expect(body.store).toBe(false);
        expect(body.input[0].content[0].type).toBe(
          mime === "application/pdf" ? "input_file" : "input_image",
        );
        expect(body.text.format.strict).toBe(true);
      } else
        expect(body.messages[0].content[0].type).toBe(
          mime === "application/pdf" ? "document" : "image",
        );
    });
  }
it("rejects incomplete OpenAI output and truncated Claude output", async () => {
  setup();
  for (const provider of ["openai", "anthropic"] as const) {
    (await saveAIConfig({ provider, model: "test", apiKey: "key" }));
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            provider === "openai"
              ? { status: "incomplete", output: [] }
              : { stop_reason: "max_tokens", content: [] },
          ),
        ),
    );
    await expect(
      createExtractionProvider().extract({
        mime: "image/png",
        bytes: Buffer.from("x"),
      }),
    ).rejects.toThrow();
  }
});

it("model lookup uses only the requested provider key and excludes incompatible models", async () => {
  setup();
  (await saveAIConfig({ provider: "openai", model: "gpt-4.1", apiKey: "openai-only" }));
  (await saveAIConfig({
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    apiKey: "claude-only",
  }));
  const { availableAIModels, aiStatus } = await import("../src/lib/ai-config");
  const mock = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        data: [
          { id: "gpt-4.1" },
          { id: "gpt-4o-audio-preview" },
          { id: "text-embedding-3-small" },
        ],
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        data: [
          { id: "claude-sonnet-4-6", display_name: "Sonnet" },
          {
            id: "claude-text-only",
            capabilities: { image_input: { supported: false } },
          },
        ],
      }),
    );
  vi.stubGlobal("fetch", mock);
  expect(await availableAIModels(undefined, "openai")).toEqual([
    { id: "gpt-4.1", name: "gpt-4.1" },
  ]);
  expect(JSON.stringify(mock.mock.calls[0][1].headers)).toContain(
    "openai-only",
  );
  expect(await availableAIModels(undefined, "anthropic")).toEqual([
    { id: "claude-sonnet-4-6", name: "Sonnet" },
  ]);
  expect(JSON.stringify(mock.mock.calls[1][1].headers)).toContain(
    "claude-only",
  );
  expect(JSON.stringify((await aiStatus()))).not.toContain("only");
  (await saveAIConfig({ provider: "openai", model: "gpt-4.1", removeKey: true }));
  await expect(availableAIModels(undefined, "openai")).rejects.toThrow();
  expect((await readAIConfig("anthropic")).apiKey).toBe("claude-only");
});

it("refusal and invalid structured fields fall back without exposing provider errors", async () => {
  setup();
  const { extractInvoice } = await import("../src/lib/extraction");
  (await saveAIConfig({ provider: "openai", model: "gpt-4.1", apiKey: "key" }));
  for (const content of [
    [{ type: "refusal", text: "private details" }],
    [
      {
        type: "output_text",
        text: JSON.stringify({ ...blankInvoice(), amountDue: 23 }),
      },
    ],
  ]) {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            status: "completed",
            output: [{ type: "message", content }],
          }),
        ),
    );
    const result = await extractInvoice(
      Buffer.from("x"),
      "image/png",
      createExtractionProvider(),
    );
    expect(result.method).toBe("manual");
    expect(result.data.amountDue).toBeNull();
    expect(result.note).not.toContain("private");
  }
});

