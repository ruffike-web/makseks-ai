import { expect, test, type Page } from "@playwright/test";
import { blankInvoice, defaultSettings, type Status } from "../../src/lib/domain";
import type { AppState, InvoiceView } from "../../src/lib/service";

function invoice(
  id: string,
  status: Status,
  dueDate: string | null,
  amountDue = "10.00",
): InvoiceView {
  const data = {
    ...blankInvoice(),
    supplierName: `Test supplier ${id}`,
    supplierIban: "EE382200221020145685",
    invoiceNumber: id,
    amountDue,
    currency: "EUR",
    dueDate,
  };
  return {
    id,
    companyId: "default",
    version: 1,
    sourceFileName: `${id}.pdf`,
    sourceFileHash: null,
    data,
    originalData: data,
    provenance: {},
    extractionMethod: "manual",
    extractionNote: null,
    accountCandidates: [],
    approvedAt: status === "READY" ? "2026-10-20T09:00:00.000Z" : null,
    approvalContext: "synthetic-review-context",
    duplicateAcknowledged: false,
    accountChangeAcknowledged: false,
    exportedAt: status === "EXPORTED" ? "2026-10-20T10:00:00.000Z" : null,
    exportedVersion: status === "EXPORTED" ? 1 : null,
    archivedAt: null,
    createdAt: "2026-10-20T08:00:00.000Z",
    updatedAt: "2026-10-20T09:00:00.000Z",
    reviewContext: "synthetic-review-context",
    status,
    issues: [],
    // The warning must use the invoice due date, not a future payment date.
    executionDate: "2026-11-01",
    description: `Arve ${id}`,
    duplicate: false,
    accountChanged: false,
    ctx: {
      today: "2026-10-22",
      approved: status === "READY",
      duplicate: false,
      accountChanged: false,
      supplierConflict: false,
      duplicateAcknowledged: false,
      accountChangeAcknowledged: false,
      exported: status === "EXPORTED",
    },
    supplier: null,
  };
}

async function mockWorkspace(
  page: Page,
  invoices: InvoiceView[],
  language: "et" | "en" = "et",
) {
  const state: AppState = {
    companyId: "default",
    settings: {
      ...defaultSettings(),
      companyName: "Due date browser test OÜ",
      iban: "EE121010000000000016",
    },
    today: "2026-10-22",
    invoices,
    suppliers: [],
    payerIssues: [],
    aiConfigured: false,
    desktop: false,
    aiModel: "test-model",
    aiProvider: "gemini",
    aiProviders: {
      gemini: { configured: false, locked: false, model: "test-model" },
      openai: { configured: false, locked: false, model: "test-model" },
      anthropic: { configured: false, locked: false, model: "test-model" },
      groq: { configured: false, locked: false, model: "test-model" },
      mistral: { configured: false, locked: false, model: "test-model" },
    },
  };
  const requests: { path: string; method: string }[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    requests.push({ path, method: request.method() });
    if (request.method() !== "GET") {
      await route.fulfill({ status: 400, json: { error: "Unexpected mutation" } });
      return;
    }
    if (path === "/api/state") {
      await route.fulfill({ json: state });
    } else if (path === "/api/companies") {
      await route.fulfill({ json: [{ id: "default", name: state.settings.companyName }] });
    } else if (path === "/api/preferences") {
      await route.fulfill({ json: { language } });
    } else {
      await route.fulfill({ status: 404, json: { error: "Unexpected test request" } });
    }
  });
  return { state, requests };
}

function row(page: Page, id: string) {
  return page.getByRole("row").filter({
    has: page.getByRole("button", { name: `Test supplier ${id}`, exact: true }),
  });
}

test("only due unexported ready invoices and their summary are highlighted", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-22T09:00:00Z"));
  const reapproved = invoice("reapproved", "READY", "2026-10-21", "25.00");
  reapproved.exportedAt = "2026-10-20T10:00:00.000Z";
  reapproved.exportedVersion = 0;
  const { state } = await mockWorkspace(page, [
    invoice("today", "READY", "2026-10-22"),
    invoice("overdue", "READY", "2026-10-21", "20.00"),
    invoice("future", "READY", "2026-10-23", "30.00"),
    invoice("exported", "EXPORTED", "2026-10-21"),
    invoice("review", "REVIEW_REQUIRED", "2026-10-21"),
    invoice("invalid", "INVALID", "2026-10-21"),
    invoice("no-date", "READY", null, "40.00"),
    invoice("bad-date", "READY", "2026-02-30", "50.00"),
    reapproved,
  ]);
  await page.goto("/");
  await expect(page.locator(".stats .due-stat")).toHaveCount(2);
  const readyCount = page.locator(".stats > div").filter({ hasText: "Valmis makseid" });
  await expect(readyCount.locator("strong")).toHaveText("6");
  await expect(page.locator(".stats .total-stat strong")).toHaveText(/175,00\s*€/);
  expect((await page.locator(".stats").boundingBox())!.height).toBeLessThanOrEqual(95);
  expect((await page.locator(".dropzone").boundingBox())!.height).toBeLessThanOrEqual(150);
  await page.screenshot({ path: "test-results/due-attention-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Arvete kontroll", exact: true }).click();
  await expect(page.locator("tr.invoice-due")).toHaveCount(3);
  await expect(row(page, "today").locator(".due-note")).toHaveText("Tähtaeg täna");
  for (const id of ["overdue", "reapproved"]) {
    await expect(row(page, id).locator(".due-note")).toHaveText("Tähtaeg möödas");
  }
  await expect(row(page, "today").locator(".badge")).toHaveText("Valmis");
  for (const id of ["future", "exported", "review", "invalid", "no-date", "bad-date"]) {
    await expect(row(page, id)).not.toHaveClass(/invoice-due/);
    await expect(row(page, id).locator(".due-note")).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Valmis arved", exact: true }).click();
  await expect(row(page, "exported")).toBeVisible();
  await expect(row(page, "exported")).not.toHaveClass(/invoice-due/);
  await page.screenshot({ path: "test-results/due-attention-ready.png", fullPage: true });

  // Refreshing with exported versions must clear the warning, while other ready
  // invoices remain included in the existing ready count and sum.
  for (const item of state.invoices) {
    if (["today", "overdue", "reapproved"].includes(item.id)) {
      item.status = "EXPORTED";
      item.exportedAt = "2026-10-22T09:30:00.000Z";
      item.exportedVersion = item.version;
    }
  }
  await page.reload();
  await expect(page.locator(".stats .due-stat")).toHaveCount(0);
  await expect(readyCount.locator("strong")).toHaveText("3");
  await expect(page.locator(".stats .total-stat strong")).toHaveText(/120,00\s*€/);
  await expect(page.locator("tr.invoice-due")).toHaveCount(0);

  for (const width of [780, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("button", { name: "Vali arvefailid", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/due-attention-${width}.png`, fullPage: true });
  }
});

test("due warnings have English labels without changing the ready status", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-22T09:00:00Z"));
  await mockWorkspace(page, [
    invoice("today", "READY", "2026-10-22"),
    invoice("overdue", "READY", "2026-10-21"),
  ], "en");
  await page.goto("/");
  await expect(row(page, "today").locator(".due-note")).toHaveText("Due today");
  await expect(row(page, "overdue").locator(".due-note")).toHaveText("Overdue");
  await expect(row(page, "today").locator(".badge")).toHaveText("Ready");
  await expect(page.locator(".stats .due-stat")).toHaveCount(2);
});

test("Tallinn midnight updates warnings without a server refresh or selection reset", async ({ page }) => {
  const beforeMidnight = new Date("2026-10-21T20:59:50Z");
  await page.clock.install({ time: beforeMidnight });
  await page.clock.pauseAt(beforeMidnight);
  const { requests } = await mockWorkspace(page, [
    invoice("tomorrow", "READY", "2026-10-22"),
    invoice("later", "READY", "2026-10-23"),
  ]);
  await page.goto("/");
  await expect(page.locator(".stats")).toBeVisible();
  await expect(page.locator(".stats .due-stat")).toHaveCount(0);
  await page.getByRole("button", { name: "Maksefail", exact: true }).click();
  const selectedInvoice = page.getByRole("checkbox", { name: "Vali arve tomorrow", exact: true });
  await selectedInvoice.uncheck();
  await expect(selectedInvoice).not.toBeChecked();
  const stateRequestsBefore = requests.filter((request) => request.path === "/api/state").length;

  // UTC is still 21 October, but Tallinn is now 22 October.
  await page.clock.fastForward(45_000);
  await expect(row(page, "tomorrow").locator(".due-note")).toHaveText("Tähtaeg täna");
  await expect(row(page, "later")).not.toHaveClass(/invoice-due/);
  await expect(selectedInvoice).not.toBeChecked();
  expect(requests.filter((request) => request.path === "/api/state")).toHaveLength(stateRequestsBefore);
  expect(requests.every((request) => request.method === "GET")).toBe(true);
  await page.getByRole("button", { name: "Arvete kontroll", exact: true }).click();
  await expect(page.locator(".stats .due-stat")).toHaveCount(2);
  await expect(row(page, "tomorrow").locator(".badge")).toHaveText("Valmis");
});
