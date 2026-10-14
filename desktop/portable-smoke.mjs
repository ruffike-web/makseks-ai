import { chromium, expect } from "@playwright/test";
import { mkdtemp, copyFile, stat, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import net from "node:net";
import { tmpdir } from "node:os";
import { blankInvoice, defaultSettings } from "../src/lib/domain.ts";
import { invoicePdf } from "../tests/pdf-fixture.ts";
const { version } = JSON.parse(
  await readFile("desktop/app/package.json", "utf8"),
);
const fast = process.argv.includes("--fast");
const directory = await mkdtemp(
  fast
    ? join(tmpdir(), "makseks-fast-test-")
    : resolve("test-results/portable-"),
);
const appDirectory = fast ? join(directory, "Makseks AI") : directory;
const executable = join(appDirectory, "Makseks AI.exe");
if (fast) {
  execFileSync(
    resolve("node_modules/electron-winstaller/vendor/7z.exe"),
    [
      "x",
      resolve(`release/Makseks-AI-${version}-portable-kiire.zip`),
      `-o${directory}`,
      "-y",
    ],
    { windowsHide: true, stdio: "ignore" },
  );
  await writeFile("test-results/fast-portable-executable.txt", executable);
  const rendered = execFileSync(join(appDirectory, "resources/runtime/node.exe"), [
    "-e",
    "const {PDFParse}=require(process.argv[1]); (async()=>{const p=new PDFParse({data:Buffer.from(process.argv[2],'base64'),isEvalSupported:false});try{const r=await p.getScreenshot({first:3,desiredWidth:1600,imageDataUrl:true,imageBuffer:false});if(r.total!==1||r.pages.length!==1||!r.pages[0].dataUrl.startsWith('data:image/png;base64,')||Math.abs(r.pages[0].width-1600)>0.01)throw new Error(JSON.stringify({total:r.total,pages:r.pages.length,width:r.pages[0]?.width,prefix:r.pages[0]?.dataUrl.slice(0,30)}));console.log('Bundled PDF to PNG rendering PASS');}finally{await p.destroy();}})().catch(e=>{console.error(e.message);process.exit(1);});",
    join(appDirectory, "resources/server/node_modules/pdf-parse"), invoicePdf().toString("base64"),
  ], { windowsHide: true, encoding: "utf8", timeout: 30000 });
  console.log(rendered.trim());
} else
  await copyFile(
    resolve(`release/Makseks-AI-${version}-portable.exe`),
    executable,
  );
const port = await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    server.close(() => resolve(port));
  });
});
const job = spawn(executable, [`--remote-debugging-port=${port}`], {
  cwd: directory,
  windowsHide: true,
  stdio: "ignore",
  env: { ...process.env, ARVE_DATA_DIR: "", ARVE_SMOKE_TEST: "1" },
});
let browser;
try {
  await expect
    .poll(
      async () => {
        try {
          return (await fetch(`http://127.0.0.1:${port}/json/version`)).ok;
        } catch {
          return false;
        }
      },
      { timeout: 90000, intervals: [1000] },
    )
    .toBe(true);
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0];
  const page = context.pages()[0] || (await context.waitForEvent("page"));
  await expect(
    page.getByRole("heading", { name: "Lisa ostuarved", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Seaded", exact: true }).click();
  await expect(
    page.getByLabel("Google Gemini API-võti", { exact: true }),
  ).toBeVisible();
  for (const [provider, ids] of [
    ["openai", ["gpt-6.1-sol", "gpt-6-luna", "gpt-6-astra"]],
    ["anthropic", ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5", "claude-fable-5-1"]],
    ["groq", ["qwen/qwen3.8-27b"]],
    ["mistral", ["mistral-ocr-latest"]],
  ]) {
    await page.getByLabel("AI teenusepakkuja").selectOption(provider);
    for (const id of ids) {
      await page.getByLabel("Mudelite valik").selectOption(id);
      await expect(page.getByLabel("AI mudel", { exact: true })).toHaveValue(id);
    }
  }
  await page.getByLabel("AI teenusepakkuja").selectOption("gemini");
  console.log("All OpenAI/Claude/Groq/Mistral catalog models selectable without an API key PASS");
  expect(
    (await stat(join(appDirectory, "Makseks-AI-andmed/app.db"))).size,
  ).toBeGreaterThan(0);
  const api = (path, method = "GET", body) =>
    page.evaluate(
      async ({ path, method, body }) => {
        const response = await fetch(`/api/${path}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            "X-Company-Id": "default",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(JSON.stringify(result));
        return result;
      },
      { path, method, body },
    );
  const accounts = {
    SEB: "EE121010000000000016",
    LHV: "EE337700771001260958",
    COOP: "EE214204200000000000",
    SWEDBANK: "EE382200221020145685",
  };
  for (const bank of Object.keys(accounts)) {
    await api("settings", "PUT", {
      ...defaultSettings(),
      companyName: "Portable test OÜ",
      preferredBank: bank,
      iban: accounts[bank],
    });
    const row = await api("invoices", "POST", {});
    await api(`invoices/${row.id}`, "PUT", {
      version: row.version,
      data: {
        ...blankInvoice(),
        supplierName: "Portable tarnija OÜ",
        supplierIban: "EE382200221020145685",
        invoiceNumber: `PORTABLE-${bank}`,
        amountDue: "20.20",
        currency: "EUR",
        dueDate: "2030-10-20",
      },
    });
    const item = (await api("state")).invoices.find((i) => i.id === row.id);
    await api(`invoices/${row.id}/approve`, "POST", {
      version: item.version,
      reviewContext: item.reviewContext,
      reviewed: true,
      duplicate: false,
      accountChange: false,
      rememberSupplier: false,
    });
    const result = await api("export", "POST", { ids: [row.id] });
    expect(result.validation.status).toBe("valid");
    expect(result.xml).toContain("pain.001.001.09");
    console.log(`Portable ${bank} schema validation PASS`);
  }
  await page.reload();
  await page
    .getByRole("button", { name: "Arvete import", exact: true })
    .click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "portable-fixture.pdf",
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
  await page.getByRole("button", { name: "Seaded", exact: true }).click();
  await page.screenshot({
    path: "test-results/portable-settings.png",
    fullPage: true,
  });
  console.log(
    `Portable ${fast ? "ZIP" : "EXE"}: startup, adjacent data directory, settings, all four banks and PDF parsing PASS`,
  );
  await page.evaluate(() => window.close()).catch(() => {});
} finally {
  await browser?.close();
  if (job.exitCode === null) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (job.exitCode === null) {
      try {
        execFileSync("taskkill.exe", ["/PID", String(job.pid), "/T", "/F"], {
          windowsHide: true,
          stdio: "ignore",
        });
      } catch {}
    }
  }
}



