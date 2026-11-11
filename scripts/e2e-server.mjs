// Starts the production build against a fresh, migrated database so browser
// tests never touch the user's data. Used by playwright.config.ts (webServer).
import { mkdirSync, mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const require = createRequire(import.meta.url);
const { migrate } = require("../desktop/bootstrap.cjs");
mkdirSync("test-results", { recursive: true });
const dataDir = mkdtempSync(resolve("test-results/e2e-data-"));
const database = join(dataDir, "app.db");
await migrate(database, resolve("prisma/migrations"));
const port = process.env.E2E_PORT || "3000";
const server = spawn(
  process.execPath,
  [resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", port],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: `file:${database.replaceAll("\\", "/")}`,
      ARVE_DATA_DIR: dataDir,
      ARVE_AI_CONFIG_FILE: join(dataDir, "ai-config.json"),
      GEMINI_API_KEY: "",
      OPENAI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      GROQ_API_KEY: "",
      MISTRAL_API_KEY: "",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill());
server.on("exit", (code) => process.exit(code ?? 1));
