import { _electron as electron, expect } from "@playwright/test";
import { mkdtemp, mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";

await mkdir("test-results", { recursive: true });
const dataDir = await mkdtemp(resolve("test-results/key-protection-"));
const file = join(dataDir, "ai-config.json");
await writeFile(file, JSON.stringify({ apiKey: "synthetic-legacy-key", model: "gemini-test" }));
let application, page;
async function launch() {
  application = await electron.launch({
    executablePath: resolve(process.env.ARVE_TEST_EXE || "release/win-unpacked/Makseks AI.exe"),
    env: { ...process.env, ARVE_DATA_DIR: dataDir, ARVE_AI_CONFIG_FILE: "", ARVE_SMOKE_TEST: "1",
      GEMINI_API_KEY: "", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", GROQ_API_KEY: "", MISTRAL_API_KEY: "" },
    timeout: 60000,
  });
  page = await application.firstWindow();
  await expect(page.getByRole("heading", { name: "Lisa ostuarved", exact: true })).toBeVisible({ timeout: 30000 });
}
async function api(path, method = "GET", body) {
  return page.evaluate(async ({ path, method, body }) => {
    const response = await fetch(`/api/${path}`, {
      method, headers: { "X-Company-Id": "default", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Synthetic API request failed: ${response.status}`);
    return response.json();
  }, { path, method, body });
}
async function verifyEncrypted(provider, expected) {
  const raw = await readFile(file, "utf8"), config = JSON.parse(raw);
  expect(raw).not.toContain(expected);
  expect(config.providers[provider].apiKey).toBe("");
  const matches = await application.evaluate(({ safeStorage }, { encrypted, expected }) =>
    safeStorage.decryptString(Buffer.from(encrypted, "base64")) === expected,
    { encrypted: config.providers[provider].protectedApiKey, expected });
  expect(matches).toBe(true);
}
try {
  await launch();
  await verifyEncrypted("gemini", "synthetic-legacy-key");
  expect((await readdir(dataDir)).filter(name => name.startsWith("ai-config"))).toEqual(["ai-config.json"]);
  await api("invoices", "POST", {});
  await api("ai-config", "PUT", { provider: "openai", model: "gpt-test", apiKey: "synthetic-new-key" });
  await verifyEncrypted("openai", "synthetic-new-key");
  await application.close();
  application = undefined;
  await launch();
  expect((await api("state")).aiProviders.openai.configured).toBe(true);
  await verifyEncrypted("gemini", "synthetic-legacy-key");
  await verifyEncrypted("openai", "synthetic-new-key");
  const stored = JSON.parse(await readFile(file, "utf8"));
  stored.providers.openai.protectedApiKey = Buffer.from("unreadable-on-this-account").toString("base64");
  await writeFile(file, JSON.stringify(stored));
  await page.reload();
  await page.getByRole("button", { name: "Seaded", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Salvestatud API-võtit ei saa" })).toBeVisible();
  expect((await api("state")).invoices).toHaveLength(1);
  await page.getByLabel("Keel / Language", { exact: true }).selectOption("en");
  await expect(page.getByRole("alert").filter({ hasText: "saved API key cannot be unlocked" })).toBeVisible();
  await page.getByLabel("OpenAI (ChatGPT mudelid) API key", { exact: true }).fill("synthetic-replacement-key");
  await page.getByRole("button", { name: "Save AI settings", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "saved API key cannot be unlocked" })).not.toBeVisible();
  await verifyEncrypted("openai", "synthetic-replacement-key");
  await api("ai-config", "PUT", { provider: "openai", model: "gpt-test", removeKey: true });
  const state = await api("state");
  expect(state.aiProviders.openai.configured).toBe(false);
  expect(state.aiProviders.gemini.configured).toBe(true);
  expect(JSON.stringify(state)).not.toContain("synthetic-");
  console.log("Windows DPAPI: plaintext migration, encrypted save, restart, locked-key ET/EN warning, replacement/removal and preserved invoices PASS");
} finally { if (application) await application.close(); }
