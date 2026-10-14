import { _electron as electron, expect } from "@playwright/test";
import { mkdtemp, mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

await mkdir("test-results", { recursive: true });
const dataDir = await mkdtemp(resolve("test-results/language-data-"));
let application;
async function launch() {
  application = await electron.launch({
    executablePath: resolve(process.env.ARVE_TEST_EXE || "release/win-unpacked/Makseks AI.exe"),
    env: { ...process.env, ARVE_DATA_DIR: dataDir, ARVE_SMOKE_TEST: "1" },
    timeout: 60000,
  });
  return application.firstWindow();
}
async function menuLabels() {
  return application.evaluate(({ Menu }) => Menu.getApplicationMenu().items.map((item) => item.label));
}
async function state(page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/state", { headers: { "X-Company-Id": "default" } });
    if (!response.ok) throw new Error("Cannot read synthetic company state");
    return response.json();
  });
}
try {
  let page = await launch();
  await expect(page.getByRole("heading", { name: "Lisa ostuarved", exact: true })).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Seaded", exact: true }).click();
  await page.evaluate(async () => {
    const response = await fetch("/api/invoices", {
      method: "POST", headers: { "X-Company-Id": "default", "Content-Type": "application/json" }, body: "{}",
    });
    if (!response.ok) throw new Error("Cannot create synthetic invoice");
  });
  const before = await state(page);
  await page.getByLabel("Ettevõtte nimi", { exact: true }).fill("Unsaved bilingual test OÜ");
  await page.getByLabel("Keel / Language", { exact: true }).selectOption("en");
  await expect(page.getByLabel("Company name", { exact: true })).toHaveValue("Unsaved bilingual test OÜ");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect.poll(menuLabels).toContain("File");
  expect(before.invoices).toHaveLength(1);
  expect((await state(page)).invoices[0].reviewContext).toEqual(before.invoices[0].reviewContext);
  expect((await state(page)).settings).toEqual(before.settings);
  expect(JSON.parse(await readFile(resolve(dataDir, "ui-preferences.json"), "utf8"))).toEqual({ language: "en" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Invoice import", exact: true }).click();
  await page.getByRole("button", { name: "Add manually", exact: true }).first().click();
  await expect(page.getByRole("dialog").getByText("Supplier name is missing.", { exact: true })).toBeVisible();
  await page.getByLabel("Supplier name", { exact: false }).fill("Seaded OÜ");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByLabel("Supplier name", { exact: false })).toHaveValue("Seaded OÜ");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Close invoice", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await application.close();
  application = undefined;
  page = await launch();
  await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeVisible({ timeout: 30000 });
  await expect.poll(menuLabels).toContain("File");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Keel / Language", { exact: true }).selectOption("et");
  await expect(page.getByLabel("Ettevõtte nimi", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "et");
  await expect.poll(menuLabels).toContain("Fail");
  console.log("Language smoke passed: live ET/EN switch, unsaved form preservation, payment settings unchanged, reload/restart persistence, native menus.");
} finally {
  if (application) await application.close();
}
