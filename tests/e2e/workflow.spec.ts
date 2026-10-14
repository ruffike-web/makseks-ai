import { test, expect } from "@playwright/test";
import { invoicePdf } from "../pdf-fixture";
import { blankInvoice, defaultSettings } from "../../src/lib/domain";
test("companies switch independently in two tabs and reject cross-company API requests", async ({
  page,
  context,
  request,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Lisa ostuarved", exact: true }),
  ).toBeVisible();
  const otherTab = await context.newPage();
  await otherTab.goto("/");
  await expect(otherTab.getByLabel("Aktiivne ettevõte")).toHaveValue("default");
  await page
    .getByRole("button", { name: "Lisa ettevõte", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const name = `Teine firma ${Date.now()}`;
  await dialog.getByLabel("Uue ettevõtte nimi").fill(name);
  await dialog.getByRole("button", { name: "Loo ettevõte" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel("Aktiivne ettevõte")).not.toHaveValue("default");
  const id = await page.getByLabel("Aktiivne ettevõte").inputValue();
  await expect(otherTab.getByLabel("Aktiivne ettevõte")).toHaveValue("default");
  await page.reload();
  await expect(page.getByLabel("Aktiivne ettevõte")).toHaveValue(id);
  await page.getByRole("button", { name: "Seaded", exact: true }).click();
  await expect(page.getByLabel("Ettevõtte nimi", { exact: true })).toHaveValue(
    name,
  );
  await expect(page.getByLabel("Maksja IBAN", { exact: true })).toHaveValue("");
  const origin = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
  const response = await request.post("/api/invoices", {
    headers: { Origin: origin, "X-Company-Id": id },
    data: {},
  });
  expect(response.ok()).toBe(true);
  const invoice = await response.json();
  expect(
    (
      await request.delete(`/api/invoices/${invoice.id}`, {
        headers: { Origin: origin, "X-Company-Id": "default" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.get("/api/state", { headers: { "X-Company-Id": "" } })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.get("/api/state", {
        headers: { "X-Company-Id": "nonexistent" },
      })
    ).status(),
  ).toBe(400);
  await page.reload();
  await page
    .getByRole("button", { name: "Arvete kontroll", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Käsitsi lisatud arve" }),
  ).toHaveCount(1);
  await page.getByLabel("Aktiivne ettevõte").selectOption("default");
  await expect(
    page.getByRole("heading", { name: "Lisa ostuarved", exact: true }),
  ).toBeVisible();
  await otherTab.close();
});
test("configure payer, review manual invoice, remember supplier and download valid XML", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Lisa ostuarved", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/workspace-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Seaded", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Pank", exact: true })
    .selectOption("SEB");
  await page
    .getByLabel("Ettevõtte nimi", { exact: true })
    .fill("Brauseri testettevõte OÜ");
  await page
    .getByLabel("Maksja IBAN", { exact: true })
    .fill("EE121010000000000016");
  await page
    .getByRole("button", { name: "Salvesta seaded", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Seaded on salvestatud");
  await page
    .getByRole("button", { name: "Arvete import", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Lisa käsitsi", exact: false })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByLabel("Tarnija nimi", { exact: false })
    .fill("Õie & Poeg OÜ");
  await dialog
    .getByLabel("Saaja IBAN", { exact: false })
    .fill("EE382200221020145685");
  await dialog
    .getByLabel("Arve number", { exact: false })
    .fill(`TEST-${Date.now()}`);
  await dialog
    .getByLabel("Tasumisele kuuluv summa", { exact: false })
    .fill("20,20");
  await dialog.getByLabel("Valuuta", { exact: false }).fill("EUR");
  await dialog.getByLabel("Maksetähtpäev", { exact: true }).fill("2030-10-20");
  await dialog.getByLabel("Viitenumber", { exact: true }).fill("1231247");
  await dialog.getByRole("button", { name: "Salvesta muudatused" }).click();
  await expect(
    dialog.getByRole("button", { name: "Salvesta muudatused" }),
  ).toBeDisabled();
  await dialog.getByRole("checkbox", { name: /Jäta tarnija andmed/ }).check();
  await expect(
    dialog.getByRole("checkbox", { name: /Jäta tarnija andmed/ }),
  ).toBeChecked();
  await dialog
    .getByRole("checkbox", { name: /Kontrollisin algdokumendilt/ })
    .check();
  await dialog.getByRole("button", { name: "Kinnita arve" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText("Arve on kinnitatud ja maksefailiks valmis."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Maksefail", exact: true }).click();
  await page.getByRole("button", { name: "Genereeri maksefail" }).click();
  await expect(
    page.getByRole("heading", { name: "Maksefail on valmis", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("SEB XML läbis", { exact: false })).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Laadi XML alla" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^maksed_.*_SEB.xml$/);
  await page.getByRole("button", { name: "Tarnijad", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Õie & Poeg OÜ" }),
  ).toBeVisible();
  await page
    .locator(".supplier-row")
    .filter({
      has: page.getByRole("heading", { name: "Õie & Poeg OÜ", exact: true }),
    })
    .getByRole("button", { name: "Muuda tarnijat" })
    .click();
  const supplierDialog = page.getByRole("dialog");
  await supplierDialog
    .getByLabel("Tarnija nimi", { exact: true })
    .fill("Õie & Poeg OÜ (parandatud)");
  await supplierDialog
    .getByLabel("Linn / asula", { exact: true })
    .fill("Tartu");
  await supplierDialog.getByLabel("Riigikood", { exact: true }).fill("EE");
  await supplierDialog
    .getByRole("button", { name: "Salvesta tarnija" })
    .click();
  await expect(supplierDialog).not.toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Õie & Poeg OÜ (parandatud)",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Arvete kontroll", exact: true })
    .click();
  await expect(
    page.getByText("varem eksporditud", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Valmis arved", exact: true }).click();
  await expect(
    page.getByText("Eksporditud", { exact: true }).first(),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Arvete import", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/workspace-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("uploads PDF and PNG while isolating a spoofed image failure", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Lisa ostuarved", exact: true }),
  ).toBeVisible();
  const tag = Date.now();
  await page.locator('input[type="file"]').setInputFiles([
    {
      name: `PDF-${tag}.pdf`,
      mimeType: "application/pdf",
      buffer: invoicePdf(),
    },
    {
      name: `bad-${tag}.png`,
      mimeType: "image/png",
      buffer: Buffer.from("not an image"),
    },
    {
      name: `PNG-${tag}.png`,
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0TwAAAAASUVORK5CYII=",
        "base64",
      ),
    },
  ]);
  await expect(
    page.getByRole("alert").filter({ hasText: "2 arvet lisatud" }),
  ).toBeVisible({ timeout: 30000 });
  const row = page.getByRole("row").filter({ hasText: `PDF-${tag}.pdf` });
  await row.getByRole("button", { name: "Kontrolli", exact: false }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByTitle("Algne ostuarve")).toBeVisible();
  await dialog.getByText("PDF-ist loetud tekst", { exact: true }).click();
  await expect(dialog.locator("pre")).toContainText("Amount due EUR 104.00");
  await page.screenshot({
    path: "test-results/invoice-review.png",
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "Sulge arve" }).click();
});
test("LHV export validates against complete XSD and groups three dates", async ({
  request,
  page,
}) => {
  const headers = {
    Origin: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    "X-Company-Id": "default",
  };
  const settings = {
    ...defaultSettings(),
    companyName: "LHV brauseritest OÜ",
    preferredBank: "LHV",
    iban: "EE337700771001260958",
  };
  expect(
    (await request.put("/api/settings", { headers, data: settings })).ok(),
  ).toBe(true);
  const ids: string[] = [];
  for (const [index, date] of [
    "2030-10-20",
    "2030-10-21",
    "2030-10-22",
  ].entries()) {
    const row = await (
      await request.post("/api/invoices", { headers, data: {} })
    ).json();
    ids.push(row.id);
    const data = {
      ...blankInvoice(),
      supplierName: "LHV testtarnija",
      supplierIban: "EE382200221020145685",
      invoiceNumber: `LHV-${Date.now()}-${index}`,
      amountDue: ["10.10", "20.20", "30.30"][index],
      currency: "EUR",
      dueDate: date,
    };
    expect(
      (
        await request.put(`/api/invoices/${row.id}`, {
          headers,
          data: { version: row.version, data },
        })
      ).ok(),
    ).toBe(true);
    const state = await (await request.get("/api/state", { headers })).json(),
      item = state.invoices.find((i: { id: string }) => i.id === row.id);
    expect(
      (
        await request.post(`/api/invoices/${row.id}/approve`, {
          headers,
          data: {
            version: item.version,
            reviewContext: item.reviewContext,
            reviewed: true,
            duplicate: false,
            accountChange: false,
            rememberSupplier: false,
          },
        })
      ).ok(),
    ).toBe(true);
  }
  await page.goto("/");
  await page.getByRole("button", { name: "Maksefail", exact: true }).click();
  await expect(
    page.getByText("Tean, et LHV täielik XSD kontroll puudub", {
      exact: false,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Genereeri maksefail" }),
  ).toBeEnabled();
  const response = await request.post("/api/export", {
    headers,
    data: { ids },
  });
  expect(response.ok()).toBe(true);
  const result = await response.json();
  expect(result.validation.status).toBe("valid");
  expect(result.xml.match(/<PmtInf>/g)).toHaveLength(3);
  expect(result.total).toBe("60.60");
});
