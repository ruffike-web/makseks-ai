import { _electron as electron, expect } from "@playwright/test";
import { mkdtemp, mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { invoicePdf } from "../tests/pdf-fixture.ts";
await mkdir("test-results", { recursive: true });
const dataDir = await mkdtemp(resolve("test-results/desktop-data-"));
const application = await electron.launch({
  executablePath: resolve(
    process.env.ARVE_TEST_EXE || "release/win-unpacked/Makseks AI.exe",
  ),
  env: { ...process.env, ARVE_DATA_DIR: dataDir, ARVE_SMOKE_TEST: "1" },
  timeout: 60000,
});
try {
  const page = await application.firstWindow();
  await expect(
    page.getByRole("heading", { name: "Lisa ostuarved", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page
    .getByRole("button", { name: "Lisa ettevõte", exact: true })
    .click();
  await page.getByLabel("Uue ettevõtte nimi").fill("Windowsi test OÜ");
  await page.getByRole("button", { name: "Loo ettevõte", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Seaded", exact: true }).click();
  await expect(page.getByLabel("Ettevõtte nimi", { exact: true })).toHaveValue(
    "Windowsi test OÜ",
  );
  await expect(
    page.getByLabel("Google Gemini API-võti", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Google Gemini API-võti", { exact: true })
    .fill("synthetic-desktop-test-key");
  await page
    .getByRole("button", { name: "Salvesta AI seaded", exact: true })
    .click();
  await expect(
    page.getByText("AI seaded salvestatud.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Google Gemini API-võti", { exact: true }),
  ).toHaveValue("");
  const companyId = await page.getByLabel("Aktiivne ettevõte").inputValue();
  const request = (path, method = "GET", body, company = companyId) =>
    page.evaluate(
      async ({ path, method, body, company }) => {
        const response = await fetch(`/api/${path}`, {
          method,
          headers: {
            "X-Company-Id": company,
            "Content-Type": "application/json",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(JSON.stringify(data));
        return data;
      },
      { path, method, body, company },
    );
  await page
    .getByRole("checkbox", { name: /Luban selle ettevõtte arve/ })
    .check();
  await page
    .getByRole("button", { name: "Salvesta seaded", exact: true })
    .click();
  const defaultState = await request("state", "GET", undefined, "default");
  await expect(page.getByText("Seaded on salvestatud.", { exact: false })).toBeVisible();
  await request(
    "settings",
    "PUT",
    { ...defaultState.settings, aiEnabled: true, aiConsentProvider: "gemini" },
    "default",
  );
  for (const [provider, label, model] of [
    ["openai", "OpenAI (ChatGPT mudelid)", "gpt-6.1-sol"],
    ["anthropic", "Anthropic Claude", "claude-sonnet-5-5"],
    ["groq", "Groq", "qwen/qwen3.8-27b"],
    ["mistral", "Mistral Document AI", "mistral-ocr-latest"],
  ]) {
    await page.getByLabel("AI teenusepakkuja").selectOption(provider);
    await page.getByLabel("Mudelite valik").selectOption(model);
    await page
      .getByLabel(`${label} API-võti`, { exact: true })
      .fill(`synthetic-${provider}-test-key`);
    await page
      .getByRole("button", { name: "Salvesta AI seaded", exact: true })
      .click();
    await expect(
      page.getByText("AI seaded salvestatud.", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: /Luban selle ettevõtte arve/ }),
    ).not.toBeChecked();
    const state = await request("state");
    expect(state.aiProvider).toBe(provider);
    expect(state.aiModel).toBe(model);
    expect(state.settings.aiEnabled).toBe(false);
    expect(
      (await request("state", "GET", undefined, "default")).settings.aiEnabled,
    ).toBe(false);
    const staleStatus = await page.evaluate(
      async (settings) =>
        (
          await fetch("/api/settings", {
            method: "PUT",
            headers: {
              "X-Company-Id": "default",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...settings,
              aiEnabled: true,
              aiConsentProvider: "gemini",
            }),
          })
        ).status,
      defaultState.settings,
    );
    expect(staleStatus).toBe(400);
    if (provider === "openai") {
      await page.getByRole("checkbox", { name: /Luban selle ettevõtte arve/ }).check();
      await page.getByRole("button", { name: "Salvesta seaded", exact: true }).click();
      await expect(page.getByText("Seaded on salvestatud.", { exact: false })).toBeVisible();
      await expect.poll(async () => (await request("state")).settings.aiConsentProvider).toBe("openai");
      expect((await request("state")).settings.aiEnabled).toBe(true);
    }
    expect(JSON.stringify(state)).not.toContain("synthetic-");
  }
  await page.getByLabel("AI teenusepakkuja").selectOption("openai");
  await expect(page.getByLabel("AI mudel", { exact: true })).toHaveValue(
    "gpt-6.1-sol",
  );
  await expect(
    page.getByLabel("OpenAI (ChatGPT mudelid) API-võti", { exact: true }),
  ).toHaveAttribute("placeholder", /salvestatud/);
  await page.getByLabel("AI teenusepakkuja").selectOption("gemini");
  await page
    .getByRole("button", { name: "Salvesta AI seaded", exact: true })
    .click();
  await expect(
    page.getByText("AI seaded salvestatud.", { exact: false }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Eemalda võti", exact: true }).click();
  await expect(
    page.getByText("API-võti eemaldatud.", { exact: true }),
  ).toBeVisible();
  for (const bank of ["SEB", "LHV"]) {
    await page.getByRole("button", { name: "Seaded", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Pank", exact: true })
      .selectOption(bank);
    await page
      .getByLabel("Maksja IBAN", { exact: true })
      .fill(bank === "SEB" ? "EE121010000000000016" : "EE337700771001260958");
    await page
      .getByRole("button", { name: "Salvesta seaded", exact: true })
      .click();
    await expect(
      page.getByText("Seaded on salvestatud.", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Arvete import", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Lisa käsitsi", exact: false })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Tarnija nimi", { exact: false })
      .fill("Windowsi testtarnija OÜ");
    await dialog
      .getByLabel("Saaja IBAN", { exact: false })
      .fill("EE382200221020145685");
    await dialog
      .getByLabel("Arve number", { exact: false })
      .fill(`DESKTOP-${bank}`);
    await dialog
      .getByLabel("Tasumisele kuuluv summa", { exact: false })
      .fill("20,20");
    await dialog.getByLabel("Valuuta", { exact: false }).fill("EUR");
    await dialog
      .getByLabel("Maksetähtpäev", { exact: true })
      .fill("2030-10-20");
    await dialog.getByRole("button", { name: "Salvesta muudatused" }).click();
    await expect(
      dialog.getByRole("button", { name: "Salvesta muudatused" }),
    ).toBeDisabled();
    await dialog
      .getByRole("checkbox", { name: /Kontrollisin algdokumendilt/ })
      .check();
    await dialog.getByRole("button", { name: "Kinnita arve" }).click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole("button", { name: "Maksefail", exact: true }).click();
    await page.getByRole("button", { name: "Genereeri maksefail" }).click();
    await expect(
      page.getByRole("heading", { name: "Maksefail on valmis", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`${bank} XML läbis`, { exact: false }),
    ).toBeVisible();
    const downloadPath = resolve(
      `test-results/desktop-${bank}-${Date.now()}.xml`,
    );
    await application.evaluate(({ session }, file) => {
      session.defaultSession.once("will-download", (_event, item) =>
        item.setSavePath(file),
      );
    }, downloadPath);
    await page.getByRole("link", { name: "Laadi XML alla" }).click();
    await expect
      .poll(async () => readFile(downloadPath, "utf8").catch(() => ""))
      .toContain("pain.001.001.09");
    console.log(`${bank} XML export PASS`);
  }
  await page
    .getByRole("button", { name: "Arvete import", exact: true })
    .click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "desktop-fixture.pdf",
    mimeType: "application/pdf",
    buffer: invoicePdf(),
  });
  await page
    .getByRole("row")
    .filter({ hasText: "TEST-1" })
    .getByRole("button", { name: "Kontrolli", exact: false })
    .click();
  const review = page.getByRole("dialog");
  await review.getByText("PDF-ist loetud tekst", { exact: true }).click();
  await expect(review.locator("pre")).toContainText("Amount due EUR 104.00");
  await review.getByRole("button", { name: "Sulge arve" }).click();
  console.log(
    "Packaged Windows app: startup, migrations, company creation, API key save/remove, SEB + LHV validated XML downloads and native PDF parsing PASS",
  );
} finally {
  await application.close();
}


