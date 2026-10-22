import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { availableAIModels, aiStatus, readAIConfig, saveAIConfig } from "../src/lib/ai-config";
import { createExtractionProvider, extractInvoice, groqDocumentImages } from "../src/lib/extraction";
import { blankInvoice } from "../src/lib/domain";
import { invoicePdf } from "./pdf-fixture";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function setup() {
  const file = join(mkdtempSync(join(tmpdir(), "new-providers-")), "ai.json");
  vi.stubEnv("ARVE_AI_CONFIG_FILE", file);
  vi.stubEnv("GROQ_API_KEY", ""); vi.stubEnv("MISTRAL_API_KEY", "");
  return file;
}
it("adds provider slots to old config without replacing saved keys, models or consent selection", async () => {
  const file = setup();
  writeFileSync(file, JSON.stringify({ provider: "openai", providers: {
    gemini: { apiKey: "g", model: "gemini-old" }, openai: { apiKey: "o", model: "gpt-4.1" }, anthropic: { apiKey: "a", model: "claude-old" },
  } }));
  expect((await readAIConfig())).toMatchObject({ provider: "openai", apiKey: "o", model: "gpt-4.1" });
  (await saveAIConfig({ provider: "groq", apiKey: "groq-secret", model: "qwen/qwen3.8-27b" }));
  (await saveAIConfig({ provider: "mistral", apiKey: "mistral-secret", model: "mistral-ocr-latest" }));
  expect((await readAIConfig("groq")).apiKey).toBe("groq-secret");
  expect((await readAIConfig("openai")).apiKey).toBe("o");
  expect(JSON.stringify((await aiStatus()))).not.toContain("secret");
});
// A fresh Windows CI runner can take ~30s to load the native renderer and draw
// the first PDF. Keep the real PNG assertions and a bounded integration timeout.
it("renders an actual PDF into a PNG for Groq", async () => {
  const urls = await groqDocumentImages({ bytes: invoicePdf(), mime: "application/pdf" });
  expect(urls).toHaveLength(1);
  expect(urls[0]).toMatch(/^data:image\/png;base64,/);
  expect(Buffer.from(urls[0].split(",")[1], "base64").subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
}, 60000);
it("rejects extreme PDF page dimensions before allocating a screenshot canvas", async () => {
  const { PDFParse } = await import("pdf-parse");
  // Equal-length replacement preserves this real PDF fixture's xref offsets.
  // At the normal render width this would request billions of canvas pixels.
  const tallPdf = Buffer.from(invoicePdf().toString().replace("595 842", "001 999"));
  const screenshot = vi.spyOn(PDFParse.prototype, "getScreenshot")
    .mockRejectedValue(new Error("Unsafe screenshot allocation reached"));
  await expect(groqDocumentImages({ bytes: tallPdf, mime: "application/pdf" }))
    .rejects.toThrow("mõõtmed");
  expect(screenshot).not.toHaveBeenCalled();
});
it("rejects over-three-page PDFs without sending a partial document", async () => {
  setup(); (await saveAIConfig({ provider: "groq", apiKey: "test", model: "qwen/qwen3.8-27b" }));
  const { PDFParse } = await import("pdf-parse");
  const original = PDFParse.prototype.getInfo;
  vi.spyOn(PDFParse.prototype, "getInfo").mockImplementation(async function (this: InstanceType<typeof PDFParse>, ...args) {
    const info = await original.apply(this, args); info.total = 4; return info;
  });
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  const result = await extractInvoice(invoicePdf(), "application/pdf", createExtractionProvider("groq"));
  expect(result.method).toBe("manual"); expect(result.note).toContain("3-leheküljelist");
  expect(fetchMock).not.toHaveBeenCalled();
});
for (const provider of ["groq", "mistral"] as const) {
  for (const mime of ["application/pdf", "image/png"]) {
    it(`${provider} sends ${mime} to only its own endpoint with its own key`, async () => {
      setup(); (await saveAIConfig({ provider, apiKey: `${provider}-secret`, model: provider === "groq" ? "qwen/qwen3.8-27b" : "mistral-ocr-latest" }));
      const fields = { ...blankInvoice(), supplierName: "Test supplier" };
      const mock = vi.fn().mockResolvedValue(Response.json(provider === "groq"
        ? { choices: [{ finish_reason: "stop", message: { content: JSON.stringify(fields) } }] }
        : { document_annotation: JSON.stringify(fields) }));
      vi.stubGlobal("fetch", mock);
      const result = await createExtractionProvider(provider).extract({ mime, bytes: mime === "application/pdf" ? invoicePdf() : Buffer.from("image-test") });
      expect(result.supplierName).toBe("Test supplier");
      const [url, init] = mock.mock.calls[0];
      expect(url).toBe(provider === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.mistral.ai/v1/ocr");
      expect(init.headers.Authorization).toBe(`Bearer ${provider}-secret`);
      const body = JSON.parse(init.body);
      if (provider === "groq") {
        expect(body.messages[1].content[1].image_url.url).toMatch(/^data:image\/png;base64,/);
        expect(body.response_format.type).toBe("json_object");
      } else {
        expect(body.document.type).toBe(mime === "application/pdf" ? "document_url" : "image_url");
        expect(body.document_annotation_prompt).toContain("Never use the buyer");
        expect(body.document_annotation_format.json_schema.schema).toHaveProperty("properties.supplierName");
      }
    });
  }
  it(`${provider} fails safely on quota errors or malformed output`, async () => {
    setup(); (await saveAIConfig({ provider, apiKey: "test", model: "test" }));
    for (const response of [new Response("private error", { status: 429 }), Response.json({ document_annotation: null, choices: [{ finish_reason: "length", message: { content: "{}" } }] })]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
      const result = await extractInvoice(Buffer.from("x"), "image/png", createExtractionProvider(provider));
      expect(result.method).toBe("manual"); expect(result.data.amountDue).toBeNull(); expect(result.note).not.toContain("private");
    }
  });
  it(`${provider} model list excludes models incompatible with document extraction`, async () => {
    setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ data: [{ id: "qwen/qwen3.8-27b" }, { id: "mistral-ocr-latest" }, { id: "openai/gpt-oss-120b" }, { id: "mistral-small-latest" }] })));
    expect((await availableAIModels("test", provider)).map((m) => m.id)).toEqual([provider === "groq" ? "qwen/qwen3.8-27b" : "mistral-ocr-latest"]);
  });
}
