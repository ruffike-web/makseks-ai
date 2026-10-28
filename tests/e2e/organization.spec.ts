import { expect, test, type APIRequestContext } from "@playwright/test";
import { blankInvoice, defaultSettings } from "../../src/lib/domain";
import type { AppState } from "../../src/lib/service";

const origin = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
function syntheticIban(index: number) {
  const bban = `50010517${String(index).padStart(10, "0")}`;
  const checksum = 98n - BigInt(`${bban}131400`) % 97n;
  return `DE${String(checksum).padStart(2, "0")}${bban}`;
}
async function seed(request: APIRequestContext) {
  const companyResponse = await request.post("/api/companies", {
    headers: { Origin: origin }, data: { name: `Nimekirjade test ${Date.now()}` },
  });
  expect(companyResponse.ok()).toBe(true);
  const company = await companyResponse.json();
  const headers = { Origin: origin, "X-Company-Id": company.id };
  expect((await request.put("/api/settings", { headers, data: {
    ...defaultSettings(), companyName: company.name, iban: "EE121010000000000016",
  } })).ok()).toBe(true);
  for (let index = 1; index <= 12; index++) {
    const row = await (await request.post("/api/invoices", { headers, data: {} })).json();
    expect((await request.put(`/api/invoices/${row.id}`, { headers, data: {
      version: row.version, data: {
        ...blankInvoice(), supplierName: `Nimekirja tarnija ${index}`,
        supplierRegistrationCode: String(80000000 + index), supplierIban: syntheticIban(index),
        invoiceNumber: `LIST-${index}`, invoiceDate: `2030-01-${String(index).padStart(2, "0")}`,
        amountDue: "12.34", currency: "EUR", dueDate: "2030-02-20",
      },
    } })).ok()).toBe(true);
    const state: AppState = await (await request.get("/api/state", { headers })).json();
    const item = state.invoices.find((invoice) => invoice.id === row.id)!;
    expect((await request.post(`/api/invoices/${row.id}/approve`, { headers, data: {
      version: item.version, reviewContext: item.reviewContext,
      reviewed: true, duplicate: false, accountChange: false, rememberSupplier: true,
    } })).ok()).toBe(true);
  }
  return { company, headers };
}

test("search, ten-row pages, sorting, export selection and archive restoration", async ({ page, request }) => {
  test.setTimeout(120000);
  const { company, headers } = await seed(request);
  await page.goto("/");
  await page.getByLabel("Aktiivne ettevõte").selectOption(company.id);
  await page.getByRole("button", { name: "Arvete kontroll", exact: true }).click();
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(10);
  await page.getByLabel("Järjesta arved").selectOption("date-desc");
  await expect(rows.first()).toContainText("LIST-12");
  await page.getByRole("button", { name: "Järgmine lehekülg" }).click();
  await expect(rows).toHaveCount(2);
  await page.getByLabel("Otsi arveid").fill("LIST-12");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("LIST-12");
  await page.getByLabel("Otsi arveid").fill("");
  await page.getByLabel("Järjesta arved").selectOption("date-asc");
  await expect(rows.first()).toContainText("LIST-1");
  await page.getByLabel("Järjesta arved").selectOption("supplier");
  await expect(rows.first()).toContainText("Nimekirja tarnija 1");

  await page.getByRole("button", { name: "Maksefail", exact: true }).click();
  await expect(rows).toHaveCount(10);
  const firstSelection = rows.first().getByRole("checkbox");
  await firstSelection.uncheck();
  await page.getByRole("button", { name: "Järgmine lehekülg" }).click();
  await expect(rows).toHaveCount(2);
  await expect(rows.first().getByRole("checkbox")).toBeChecked();
  await page.getByRole("button", { name: "Lehekülg 1", exact: true }).click();
  await expect(firstSelection).not.toBeChecked();

  await page.getByRole("button", { name: "Arvete kontroll", exact: true }).click();
  await page.getByLabel("Otsi arveid").fill("LIST-12");
  await rows.first().getByRole("button", { name: "Arhiveeri arve LIST-12", exact: true }).click();
  await expect(rows).toHaveCount(0);
  const state: AppState = await (await request.get("/api/state", { headers })).json();
  expect(state.invoices).toHaveLength(11);
  expect(state.archivedInvoices).toHaveLength(1);
  const archived = state.archivedInvoices[0];
  expect((await request.post(`/api/invoices/${archived.id}/restore`, { headers, data: {} })).status()).toBe(400);
  expect((await request.post(`/api/invoices/${archived.id}/restore`, {
    headers: { ...headers, "X-Company-Id": "default" }, data: { version: archived.version },
  })).status()).toBe(400);
  await page.getByRole("button", { name: "Arhiiv", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("LIST-12");
  await rows.first().getByRole("button", { name: "Taasta arve LIST-12", exact: true }).click();
  await expect(rows).toHaveCount(0);
  await page.getByRole("button", { name: "Kõik arved", exact: true }).click();
  await page.getByLabel("Otsi arveid").fill("LIST-12");
  await expect(rows.first().locator(".badge")).toHaveText("Valmis");

  await page.getByRole("button", { name: "Tarnijad", exact: true }).click();
  const suppliers = page.locator(".supplier-row");
  await expect(suppliers).toHaveCount(10);
  await expect(suppliers.first()).toContainText("Nimekirja tarnija 1");
  await page.getByRole("button", { name: "Järgmine lehekülg" }).click();
  await expect(suppliers).toHaveCount(2);
  await page.getByLabel("Otsi tarnijaid").fill("80000001");
  await expect(suppliers).toHaveCount(1);
  await expect(suppliers.first()).toContainText("Nimekirja tarnija 1");
  await page.getByLabel("Otsi tarnijaid").fill("");
  await page.getByLabel("Järjesta tarnijad").selectOption("desc");
  await expect(suppliers.first()).toContainText("Nimekirja tarnija 12");
});

test("payment days in the editor and persistent dark/light/system preferences", async ({ page, request }) => {
  await request.put("/api/preferences", { headers: { Origin: origin }, data: { language: "et", theme: "light" } });
  await page.goto("/");
  await page.getByRole("button", { name: "Lisa käsitsi", exact: false }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Arve kuupäev", { exact: true }).fill("2028-02-28");
  await dialog.getByLabel("Maksetähtaeg päevades", { exact: true }).fill("2");
  await expect(dialog.getByLabel(/^Maksetähtpäev/)).toHaveValue("2028-03-01");
  await dialog.getByLabel(/^Maksetähtpäev/).fill("2028-04-01");
  await dialog.getByLabel(/^Maksetähtaeg päevades/).fill("5");
  await expect(dialog.getByLabel(/^Maksetähtpäev/)).toHaveValue("2028-04-01");
  await dialog.getByRole("button", { name: "Salvesta muudatused" }).click();
  await expect(dialog.getByRole("button", { name: "Salvesta muudatused" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Sulge arve" }).click();
  await page.getByLabel("Kujundus", { exact: true }).first().selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByLabel("Kujundus", { exact: true }).first()).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel("Kujundus", { exact: true }).first()).toHaveValue("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: "test-results/workspace-080-dark.png", fullPage: true });
  await page.getByRole("button", { name: "Seaded", exact: true }).click();
  await page.getByLabel("Keel / Language").selectOption("en");
  await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Appearance", { exact: true }).first().selectOption("system");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Appearance", { exact: true }).first().selectOption("light");
  await page.getByRole("button", { name: "Invoice import", exact: true }).click();
  await page.screenshot({ path: "test-results/workspace-080-light-en.png", fullPage: true });
  // Leave global preferences neutral for the existing workflow tests.
  await request.put("/api/preferences", { headers: { Origin: origin }, data: { language: "et", theme: "system" } });
});
