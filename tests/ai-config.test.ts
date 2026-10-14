import { expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { aiStatus, readAIConfig, saveAIConfig } from "../src/lib/ai-config";
it("saves keys privately, retains them on model changes and supports explicit removal", () => {
  const file = join(mkdtempSync(join(tmpdir(), "makseks-ai-")), "config.json");
  vi.stubEnv("ARVE_AI_CONFIG_FILE", file);
  vi.stubEnv("GEMINI_API_KEY", "legacy-test-key");
  try {
    expect(aiStatus().configured).toBe(true);
    const status = saveAIConfig({
      apiKey: "new-test-key",
      model: "gemini-test",
    });
    expect(status).toMatchObject({
      configured: true,
      model: "gemini-test",
      provider: "gemini",
    });
    expect(JSON.stringify(status)).not.toContain("new-test-key");
    saveAIConfig({ model: "gemini-other" });
    expect(readAIConfig().apiKey).toBe("new-test-key");
    expect(JSON.parse(readFileSync(file, "utf8")).providers.gemini.model).toBe(
      "gemini-other",
    );
    expect(
      saveAIConfig({ model: "gemini-other", removeKey: true }).configured,
    ).toBe(false);
    expect(readAIConfig().apiKey).toBe("");
  } finally {
    vi.unstubAllEnvs();
  }
});
