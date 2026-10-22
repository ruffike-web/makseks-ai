import { _electron as electron, expect } from "@playwright/test";
import { mkdtemp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

await mkdir("test-results", { recursive: true });
const dataDir = await mkdtemp(resolve("test-results/due-data-"));
const application = await electron.launch({
  executablePath: resolve(process.env.ARVE_TEST_EXE || "release/win-unpacked/Makseks AI.exe"),
  env: { ...process.env, ARVE_DATA_DIR: dataDir, ARVE_SMOKE_TEST: "1" },
  timeout: 60000,
});
try {
  const page = await application.firstWindow();
  await expect(page.getByRole("heading", { name: "Lisa ostuarved", exact: true })).toBeVisible({ timeout: 30000 });
  await page.evaluate(async () => {
    const api = async (path, method = "GET", body) => {
      const response = await fetch(`/api/${path}`, {
        method,
        headers: { "Content-Type": "application/json", "X-Company-Id": "default" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(JSON.stringify(result));
      return result;
    };
    const state = await api("state");
    const dateOffset = (offset) => {
      const date = new Date(`${state.today}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      return date.toISOString().slice(0, 10);
    };
    await api("settings", "PUT", {
      ...state.settings, companyName: "Due date test payer", iban: "EE121010000000000016",
      dateMode: "manual", manualDate: dateOffset(10),
    });
    for (const [number, offset, amount, approve, exported] of [
      ["DUE-TODAY", 0, "10.00", true, false],
      ["DUE-PAST", -1, "20.00", true, false],
      ["DUE-FUTURE", 1, "30.00", true, false],
      ["DUE-EXPORTED", -1, "40.00", true, true],
      ["DUE-REVIEW", -1, "50.00", false, false],
    ]) {
      const created = await api("invoices", "POST", {});
      let invoice = (await api("state")).invoices.find((item) => item.id === created.id);
      await api(`invoices/${invoice.id}`, "PUT", { version: invoice.version, data: {
        ...invoice.data, supplierName: "Due date test supplier", supplierIban: "EE382200221020145685",
        invoiceNumber: number, amountDue: amount, currency: "EUR", dueDate: dateOffset(offset),
      } });
      if (approve) {
        invoice = (await api("state")).invoices.find((item) => item.id === created.id);
        await api(`invoices/${invoice.id}/approve`, "POST", {
          version: invoice.version, reviewContext: invoice.reviewContext, reviewed: true,
          duplicate: false, accountChange: false, rememberSupplier: false,
        });
      }
      if (exported) await api("export", "POST", { ids: [invoice.id] });
    }
  });
  await page.reload();
  await expect(page.locator(".stats .due-stat")).toHaveCount(2);
  await expect(page.locator(".stats .total-stat strong")).toHaveText(/60,00\s*€/);
  await page.getByRole("button", { name: "Arvete kontroll", exact: true }).click();
  const row = (number) => page.getByRole("row").filter({ has: page.locator("small", { hasText: number }) });
  await expect(row("DUE-TODAY").locator(".due-note")).toHaveText("Tähtaeg täna");
  await expect(row("DUE-PAST").locator(".due-note")).toHaveText("Tähtaeg möödas");
  for (const number of ["DUE-FUTURE", "DUE-EXPORTED", "DUE-REVIEW"])
    await expect(row(number)).not.toHaveClass(/invoice-due/);
  await page.getByRole("button", { name: "Seaded", exact: true }).click();
  await page.getByLabel("Keel / Language").selectOption("en");
  await page.getByRole("button", { name: "Invoice review", exact: true }).click();
  await expect(row("DUE-TODAY").locator(".due-note")).toHaveText("Due today");
  await expect(row("DUE-PAST").locator(".due-note")).toHaveText("Overdue");
  await page.getByRole("button", { name: "Payment file", exact: true }).click();
  await row("DUE-FUTURE").getByRole("checkbox").uncheck();
  await page.getByRole("button", { name: "Generate payment file", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Payment file ready", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Invoice review", exact: true }).click();
  await expect(page.locator("tr.invoice-due")).toHaveCount(0);
  await expect(page.locator(".stats .due-stat")).toHaveCount(0);
  await expect(page.locator(".stats .total-stat strong")).toHaveText(/30,00\s*€/);
  for (const number of ["DUE-TODAY", "DUE-PAST", "DUE-EXPORTED"])
    await expect(row(number).locator(".badge")).toHaveText("Exported");
  await expect(row("DUE-FUTURE").locator(".badge")).toHaveText("Ready");
  console.log("Due-date Windows smoke PASS: real approvals, today/overdue warnings in ET/EN, future/review/export exclusions, and warning removal after real XML export.");
} finally {
  await application.close();
}
