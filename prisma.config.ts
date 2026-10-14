import "dotenv/config";
import { defineConfig } from "prisma/config";
import { dirname, resolve } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
mkdirSync("data", { recursive: true });
const location = (process.env.DATABASE_URL || "file:./data/app.db").replace(
  /^file:/,
  "",
);
mkdirSync(dirname(resolve(location)), { recursive: true });
// Prisma's Windows engine cannot probe a missing SQLite file in this environment.
if (!existsSync(resolve(location)))
  writeFileSync(resolve(location), "", { flag: "wx" });
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: `file:${resolve(location).replaceAll("\\", "/")}` },
});
