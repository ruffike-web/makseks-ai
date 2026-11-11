import { expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { aiStatus, readAIConfig, saveAIConfig } from "../src/lib/ai-config";
it("saves keys privately, retains them on model changes and supports explicit removal", async () => {
  const file = join(mkdtempSync(join(tmpdir(), "makseks-ai-")), "config.json");
  vi.stubEnv("ARVE_AI_CONFIG_FILE", file);
  vi.stubEnv("GEMINI_API_KEY", "legacy-test-key");
  try {
    expect((await aiStatus()).configured).toBe(true);
    const status = (await saveAIConfig({
      apiKey: "new-test-key",
      model: "gemini-test",
    }));
    expect(status).toMatchObject({
      configured: true,
      model: "gemini-test",
      provider: "gemini",
    });
    expect(JSON.stringify(status)).not.toContain("new-test-key");
    (await saveAIConfig({ model: "gemini-other" }));
    expect((await readAIConfig()).apiKey).toBe("new-test-key");
    expect(JSON.parse(readFileSync(file, "utf8")).providers.gemini.model).toBe(
      "gemini-other",
    );
    expect(
      (await saveAIConfig({ model: "gemini-other", removeKey: true })).configured,
    ).toBe(false);
    expect((await readAIConfig()).apiKey).toBe("");
  } finally {
    vi.unstubAllEnvs();
  }
});
it("never writes an environment API key to the config file", async () => {
  const file = join(mkdtempSync(join(tmpdir(), "makseks-ai-")), "config.json");
  vi.stubEnv("ARVE_AI_CONFIG_FILE", file);
  vi.stubEnv("OPENAI_API_KEY", "env-only-secret");
  try {
    await saveAIConfig({ provider: "openai", model: "gpt-5-mini" });
    expect(readFileSync(file, "utf8")).not.toContain("env-only-secret");
    expect((await readAIConfig("openai")).apiKey).toBe("env-only-secret");
  } finally {
    vi.unstubAllEnvs();
  }
});
it("recovers from a corrupt config file, keeping a backup, so settings can be saved", async () => {
  const directory = mkdtempSync(join(tmpdir(), "makseks-ai-")),
    file = join(directory, "config.json");
  writeFileSync(file, "{ not json");
  vi.stubEnv("ARVE_AI_CONFIG_FILE", file);
  try {
    const status = await saveAIConfig({ apiKey: "fresh-key", model: "gemini-test" });
    expect(status.configured).toBe(true);
    expect((await readAIConfig()).apiKey).toBe("fresh-key");
    const backups = readdirSync(directory).filter((name) => name.startsWith("config.json.corrupt-"));
    expect(backups).toHaveLength(1);
    expect(readFileSync(join(directory, backups[0]), "utf8")).toBe("{ not json");
  } finally {
    vi.unstubAllEnvs();
  }
});
