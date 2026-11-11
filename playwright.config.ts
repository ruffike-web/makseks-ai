import { defineConfig } from "@playwright/test";
const external = Boolean(process.env.PLAYWRIGHT_BASE_URL);
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    channel: "msedge",
    headless: true,
    viewport: { width: 1440, height: 1040 },
    trace: "retain-on-failure",
  },
  // Without an explicit base URL, run the production build on a fresh
  // database. Requires `npm run build` first.
  webServer: external
    ? undefined
    : {
        command: "node scripts/e2e-server.mjs",
        url: "http://127.0.0.1:3000/api/companies",
        reuseExistingServer: false,
        timeout: 120000,
      },
  reporter: "list",
});
