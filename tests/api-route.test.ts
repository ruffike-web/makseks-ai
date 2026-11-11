import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { defaultSettings } from "../src/lib/domain";
import { consentMatchesProvider, consentedExtractionProvider } from "../src/lib/ai-consent";
import { invoicePdf } from "./pdf-fixture";

const temp = mkdtempSync(join(tmpdir(), "arve-route-"));
const origin = "http://127.0.0.1:3000";
type Handler = (request: Request, context: { params: Promise<{ path: string[] }> }) => Promise<Response>;
let handle: Handler;
let companyId: string;
let extractionCalls = 0;

vi.mock("../src/lib/extraction", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/lib/extraction")>();
  return {
    ...original,
    createExtractionProvider: (...args: Parameters<typeof original.createExtractionProvider>) => {
      extractionCalls++;
      return original.createExtractionProvider(...args);
    },
  };
});

async function call(method: string, path: string, body?: unknown, raw?: BodyInit) {
  const url = new URL(`/api/${path}`, origin);
  const request = new Request(url, {
    method,
    headers: {
      host: "127.0.0.1:3000",
      origin,
      "X-Company-Id": companyId,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const response = await handle(request, {
    params: Promise.resolve({ path: url.pathname.replace(/^\/api\//, "").split("/") }),
  });
  return { status: response.status, data: await response.json() };
}
async function settings() {
  return (await call("GET", "state")).data.settings;
}

beforeAll(async () => {
  const database = join(temp, "app.db");
  const sql = new DatabaseSync(database);
  for (const d of readdirSync("prisma/migrations").filter((d) => /^\d/.test(d)).sort())
    sql.exec(readFileSync(`prisma/migrations/${d}/migration.sql`, "utf8"));
  sql.close();
  vi.stubEnv("DATABASE_URL", `file:${database}`);
  vi.stubEnv("ARVE_DATA_DIR", temp);
  vi.stubEnv("ARVE_AI_CONFIG_FILE", join(temp, "ai-config.json"));
  vi.stubEnv("ARVE_DESKTOP_TOKEN", "");
  for (const name of ["GEMINI", "OPENAI", "ANTHROPIC", "GROQ", "MISTRAL"]) vi.stubEnv(`${name}_API_KEY`, "");
  handle = (await import("../src/app/api/[...path]/route")).POST as Handler;
  companyId = "";
  const created = await call("POST", "companies", { name: "Test OÜ" });
  companyId = created.data.id;
});
afterAll(async () => {
  vi.unstubAllEnvs();
  const { getDb } = await import("../src/lib/db");
  await getDb().$disconnect();
  rmSync(temp, { recursive: true, force: true });
});
beforeEach(async () => {
  extractionCalls = 0;
  await call("PUT", "ai-config", { provider: "gemini", model: "gemini-test", apiKey: "test-key" });
});

describe("consent helpers", () => {
  const consent = { ...defaultSettings(), aiEnabled: true, aiConsentProvider: "gemini" as const };
  it("allows only the configured provider the company approved", () => {
    expect(consentedExtractionProvider(consent, { configured: true, provider: "gemini" })).toBe("gemini");
    expect(consentedExtractionProvider(consent, { configured: true, provider: "openai" })).toBeNull();
    expect(consentedExtractionProvider(consent, { configured: false, provider: "gemini" })).toBeNull();
    expect(consentedExtractionProvider({ ...consent, aiEnabled: false }, { configured: true, provider: "gemini" })).toBeNull();
  });
  it("rejects enabling AI for a provider other than the active one", () => {
    expect(consentMatchesProvider(consent, "gemini")).toBe(true);
    expect(consentMatchesProvider(consent, "openai")).toBe(false);
    expect(consentMatchesProvider({ ...consent, aiEnabled: false }, "openai")).toBe(true);
  });
});

describe("API route", () => {
  it("blocks AI upload without consent and never creates a provider", async () => {
    const form = new FormData();
    form.set("file", new File([new Uint8Array(invoicePdf())], "invoice.pdf", { type: "application/pdf" }));
    form.set("mode", "ai");
    const response = await call("POST", "upload", undefined, form);
    expect(response.status).toBe(400);
    expect(response.data.error).toContain("nõusolekut");
    expect(extractionCalls).toBe(0);
  });
  it("rejects saving consent for a provider that is not active", async () => {
    const current = await settings();
    const response = await call("PUT", "settings", { ...current, aiEnabled: true, aiConsentProvider: "openai" });
    expect(response.status).toBe(400);
    expect(response.data.error).toContain("AI-teenusepakkuja on muutunud");
    expect((await settings()).aiEnabled).toBe(false);
  });
  it("keeps consent when a provider switch fails and clears it after a successful switch", async () => {
    const current = await settings();
    expect((await call("PUT", "settings", { ...current, aiEnabled: true, aiConsentProvider: "gemini" })).status).toBe(200);
    const failed = await call("PUT", "ai-config", { provider: "openai", model: "not a valid model!" });
    expect(failed.status).toBe(400);
    expect(await settings()).toMatchObject({ aiEnabled: true, aiConsentProvider: "gemini" });
    const switched = await call("PUT", "ai-config", { provider: "openai", model: "gpt-5-mini" });
    expect(switched.status).toBe(200);
    expect((await settings()).aiEnabled).toBe(false);
  });
  it("requires the current version to delete an invoice", async () => {
    const created = await call("POST", "invoices", {});
    expect((await call("DELETE", `invoices/${created.data.id}?version=5`)).data.error).toContain("vahepeal muutunud");
    expect((await call("DELETE", `invoices/${created.data.id}`)).status).toBe(400);
    expect((await call("DELETE", `invoices/${created.data.id}?version=0`)).status).toBe(200);
  });
  it("returns 404 for extra path segments and a fixed message for malformed JSON", async () => {
    const created = await call("POST", "invoices", {});
    expect((await call("POST", `invoices/${created.data.id}/approve/extra`, {})).status).toBe(404);
    expect((await call("POST", `invoices/${created.data.id}/supplier/extra`, { version: 0 })).status).toBe(404);
    const malformed = await call("PUT", "settings", undefined, "{ broken");
    expect(malformed.status).toBe(400);
    expect(malformed.data.error).toBe("Päringu andmed on vigased. Värskenda lehte ja proovi uuesti.");
  });
});
