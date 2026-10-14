import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { suggestedAIModels } from "../src/lib/ai-providers";
import { availableAIModels, readAIConfig, saveAIConfig } from "../src/lib/ai-config";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
for (const provider of ["openai", "anthropic"] as const) {
  it(`${provider} offers current models and preserves an existing model selection`, async () => {
    vi.stubEnv("ARVE_AI_CONFIG_FILE", join(mkdtempSync(join(tmpdir(), "catalog-")), "ai.json"));
    const existing = provider === "openai" ? "gpt-4.1" : "claude-sonnet-4-6";
    saveAIConfig({ provider, model: existing, apiKey: "test-key" });
    const ids = suggestedAIModels[provider].map((m) => m.id);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ data: ids.map((id) => ({ id })) })));
    expect((await availableAIModels(undefined, provider)).map((m) => m.id).sort()).toEqual([...ids].sort());
    expect(readAIConfig(provider).model).toBe(existing);
  });
}
