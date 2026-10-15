import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { aiStatus, readAIConfig, saveAIConfig } from "../src/lib/ai-config";

let directory: string, file: string;
let key: Buffer, unavailable: boolean;
const originalSend = process.send;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "protected-ai-"));
  file = join(directory, "ai-config.json");
  key = randomBytes(32);
  unavailable = false;
  vi.stubEnv("ARVE_AI_CONFIG_FILE", file);
  vi.stubEnv("ARVE_DESKTOP", "1");
  for (const provider of ["GEMINI", "OPENAI", "ANTHROPIC", "GROQ", "MISTRAL"])
    vi.stubEnv(`${provider}_API_KEY`, "");
  // Only the OS/IPC boundary is simulated. Real Windows DPAPI is covered by
  // the packaged Electron smoke test; all configuration IO below is real.
  process.send = ((message: { type: string; id: string; operation: string; values: string[] }) => {
    queueMicrotask(() => {
      const values = message.values.map(value => {
        try {
          if (unavailable) throw new Error("Unavailable");
          if (message.operation === "encrypt") {
            const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv);
            const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
            return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
          }
          const bytes = Buffer.from(value, "base64");
          const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
          decipher.setAuthTag(bytes.subarray(12, 28));
          return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8");
        } catch { return null; }
      });
      process.emit("message", { type: "ai-key-protection-result", id: message.id, values }, undefined);
    });
    return true;
  }) as typeof process.send;
});
afterEach(() => {
  process.send = originalSend;
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

it("migrates existing plaintext keys without leaving a plaintext backup", async () => {
  writeFileSync(file, JSON.stringify({ apiKey: "legacy-sensitive-key", model: "gemini-test" }));
  expect((await aiStatus()).configured).toBe(true);
  expect(readFileSync(file, "utf8")).not.toContain("legacy-sensitive-key");
  expect((await readAIConfig()).apiKey).toBe("legacy-sensitive-key");
  expect(readdirSync(directory)).toEqual(["ai-config.json"]);
});

it("encrypts all saved keys and retains them across model changes and concurrent provider saves", async () => {
  await Promise.all([
    saveAIConfig({ provider: "openai", model: "gpt-test", apiKey: "openai-sensitive-key" }),
    saveAIConfig({ provider: "anthropic", model: "claude-test", apiKey: "claude-sensitive-key" }),
  ]);
  await saveAIConfig({ provider: "openai", model: "gpt-other" });
  expect((await readAIConfig("openai")).apiKey).toBe("openai-sensitive-key");
  expect((await readAIConfig("anthropic")).apiKey).toBe("claude-sensitive-key");
  expect(readFileSync(file, "utf8")).not.toContain("sensitive-key");
  expect(JSON.stringify(await aiStatus())).not.toContain("sensitive-key");
  await saveAIConfig({ provider: "openai", model: "gpt-other", removeKey: true });
  expect((await readAIConfig("openai")).apiKey).toBe("");
  expect((await readAIConfig("anthropic")).apiKey).toBe("claude-sensitive-key");
});

it("keeps inaccessible ciphertext and models until the user replaces or removes that key", async () => {
  await saveAIConfig({ provider: "openai", model: "gpt-test", apiKey: "old-profile-key" });
  const before = JSON.parse(readFileSync(file, "utf8"));
  key = randomBytes(32); // Simulate moving portable data to another Windows account.
  expect((await aiStatus()).providers.openai).toMatchObject({ configured: false, locked: true, model: "gpt-test" });
  await saveAIConfig({ provider: "anthropic", model: "claude-test", apiKey: "new-profile-key" });
  expect(JSON.parse(readFileSync(file, "utf8")).providers.openai).toEqual(before.providers.openai);
  await saveAIConfig({ provider: "openai", model: "gpt-test", apiKey: "replacement-key" });
  expect((await aiStatus()).providers.openai).toMatchObject({ configured: true, locked: false });
  expect((await readAIConfig("openai")).apiKey).toBe("replacement-key");
});

it("fails closed when encryption fails without overwriting the existing file", async () => {
  await saveAIConfig({ model: "gemini-test", apiKey: "original-key" });
  const before = readFileSync(file, "utf8");
  unavailable = true;
  await expect(saveAIConfig({ model: "gemini-test", apiKey: "new-key" })).rejects.toThrow();
  expect(readFileSync(file, "utf8")).toBe(before);
  expect(readdirSync(directory)).toEqual(["ai-config.json"]);
});

it("never falls back to plaintext if the desktop protection channel is absent", async () => {
  process.send = undefined;
  await expect(saveAIConfig({ model: "gemini-test", apiKey: "must-not-leak" })).rejects.toThrow();
  expect(readdirSync(directory)).toEqual([]);
});
