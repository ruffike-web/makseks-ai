import { _electron as electron, expect } from "@playwright/test";
import { mkdtemp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { invoicePdf } from "../tests/pdf-fixture.ts";
await mkdir("test-results", { recursive: true });
const dataDir = await mkdtemp(resolve("test-results/local-data-"));
const application = await electron.launch({
  executablePath: resolve(process.env.ARVE_TEST_EXE || "release/win-unpacked/Makseks AI.exe"),
  env: { ...process.env, ARVE_DATA_DIR: dataDir, ARVE_SMOKE_TEST: "1" }, timeout: 60000,
});
try {
  const page = await application.firstWindow();
  await expect(page.getByRole("heading", { name: "Lisa ostuarved", exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.getByLabel("Andmete lugemine")).toHaveValue("local");
  const pdf = invoicePdf(["Supplier: Offline Example Ltd", "IBAN: EE382200221020145685", "Invoice no: LOCAL-42", "Invoice date: 2026-10-13", "Due date: 2030-10-20", "Subtotal: EUR 100.00", "VAT: EUR 24.00", "Paid: EUR 20.00", "Amount due: EUR 104.00"]);
  await page.locator('input[type="file"]').setInputFiles({ name: "offline-test.pdf", mimeType: "application/pdf", buffer: pdf });
  const row = page.getByRole("row").filter({ hasText: "LOCAL-42" });
  await row.getByRole("button", { name: "Kontrolli", exact: false }).click();
  await expect(page.getByLabel("Tarnija nimi", { exact: false })).toHaveValue("Offline Example Ltd");
  await expect(page.getByLabel("Tasumisele kuuluv summa", { exact: false })).toHaveValue("104.00");
  await expect(page.getByLabel("Arve number", { exact: false })).toHaveValue("LOCAL-42");
  await expect(page.getByLabel("Maksetähtpäev", { exact: false })).toHaveValue("2030-10-20");
  await expect(page.getByText("Andmed loeti kohalikult PDF-i tekstist ilma AI-teenuseta.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Sulge arve" }).click();
  const result = await page.evaluate(async () => (await fetch("/api/state", { headers: { "X-Company-Id": "default" } })).json());
  expect(result.invoices[0].status).toBe("REVIEW_REQUIRED");
  expect(result.aiConfigured).toBe(false);
  await page.getByRole("button", { name: "Seaded", exact: true }).click();
  await page.getByLabel("Keel / Language").selectOption("en");
  await page.getByRole("button", { name: "Invoice import", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "accounts-test.pdf", mimeType: "application/pdf", buffer: invoicePdf(["Supplier: Two Accounts Ltd", "IBAN: EE382200221020145685", "IBAN: EE121010000000000016", "Invoice no: MULTI-1", "Amount due: EUR 50.00"]) });
  await page.getByRole("row").filter({ hasText: "MULTI-1" }).getByRole("button", { name: "Review", exact: false }).click();
  await expect(page.getByLabel("Recipient IBAN", { exact: false })).toHaveValue("");
  await page.getByLabel("Supplier bank accounts").selectOption("EE121010000000000016");
  await expect(page.getByLabel("Recipient IBAN", { exact: false })).toHaveValue("EE121010000000000016");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Close invoice", exact: true }).click();
  await page.getByRole("row").filter({ hasText: "MULTI-1" }).getByRole("button", { name: "Review", exact: false }).click();
  await expect(page.getByLabel("Supplier bank accounts")).toHaveValue("EE121010000000000016");
  await page.getByRole("button", { name: "Close invoice", exact: true }).click();
  await page.getByRole("button", { name: "Invoice import", exact: true }).click();
  await page.getByLabel("Data reading").selectOption("manual");
  await page.locator('input[type="file"]').setInputFiles({ name: "manual-test.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByRole("row").filter({ hasText: "manual-test.pdf" }).getByRole("button", { name: "Review", exact: false }).click();
  await expect(page.getByLabel("Supplier name", { exact: false })).toHaveValue("");
  await expect(page.getByLabel("Amount due", { exact: false })).toHaveValue("");
  await page.getByRole("button", { name: "Close invoice", exact: true }).click();
  await page.evaluate(async () => {
    const api = async (path, method = "GET", body) => {
      const response = await fetch(`/api/${path}`, { method, headers: { "Content-Type": "application/json", "X-Company-Id": "default" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(JSON.stringify(result));
      return result;
    };
    const state = await api("state");
    await api("settings", "PUT", { ...state.settings, companyName: "Local test payer", iban: "EE121010000000000016" });
    const item = (await api("state")).invoices.find((i) => i.data.invoiceNumber === "LOCAL-42");
    await api(`invoices/${item.id}/approve`, "POST", { version: item.version, reviewContext: item.reviewContext, reviewed: true, duplicate: true, accountChange: false, rememberSupplier: true });
  });
  await page.getByRole("button", { name: "Invoice import", exact: true }).click();
  await page.getByLabel("Data reading").selectOption("local");
  await page.locator('input[type="file"]').setInputFiles({ name: "saved-supplier.pdf", mimeType: "application/pdf", buffer: invoicePdf(["Supplier: Offline Example Ltd", "Invoice no: SAVED-2", "Amount due: EUR 15.00"]) });
  await page.getByRole("row").filter({ hasText: "SAVED-2" }).getByRole("button", { name: "Review", exact: false }).click();
  await expect(page.getByLabel("Recipient IBAN", { exact: false })).toHaveValue("EE382200221020145685");
  const inherited = await page.evaluate(async () => (await fetch("/api/state", { headers: { "X-Company-Id": "default" } })).json());
  const saved = inherited.invoices.find((i) => i.data.invoiceNumber === "SAVED-2");
  expect(saved.provenance.supplierIban).toBe("supplier");
  expect(saved.originalData.supplierIban).toBeNull();
  expect(saved.approvedAt).toBeNull();
  console.log("Saved supplier IBAN inheritance on a name-only local PDF PASS.");
  console.log("Local PDF reading PASS: no API key, payment fields, remaining amount, review required, persisted account choice, manual override and English selector.");
} finally { await application.close(); }
