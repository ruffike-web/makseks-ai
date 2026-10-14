import { chromium, expect } from "@playwright/test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import net from "node:net";
await mkdir("test-results", { recursive: true });
const executable = resolve(process.argv[2]);
const label = process.argv[3] || "startup";
const data = await mkdtemp(resolve("test-results/benchmark-data-"));
const measurements = [];
for (let run = 1; run <= 2; run++) {
  const port = await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const port = probe.address().port;
      probe.close(() => resolve(port));
    });
  });
  const started = performance.now();
  const job = spawn(executable, [`--remote-debugging-port=${port}`], {
    windowsHide: true,
    stdio: "ignore",
    env: { ...process.env, ARVE_DATA_DIR: data, ARVE_SMOKE_TEST: "1" },
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
        { timeout: 120000, intervals: [100] },
      )
      .toBe(true);
    const browserReadyMs = Math.round(performance.now() - started);
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    const context = browser.contexts()[0];
    const page = context.pages()[0] || (await context.waitForEvent("page"));
    await expect(
      page.getByRole("heading", { name: "Lisa ostuarved", exact: true }),
    ).toBeVisible({ timeout: 60000 });
    const readyMs = Math.round(performance.now() - started);
    measurements.push({ run, browserReadyMs, readyMs });
    console.log(JSON.stringify({ label, run, browserReadyMs, readyMs }));
    await page.evaluate(() => window.close()).catch(() => {});
  } finally {
    await browser?.close();
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
await writeFile(
  resolve(`test-results/${label}.json`),
  JSON.stringify({ label, measurements }, null, 2),
);
