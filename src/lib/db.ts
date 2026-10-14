import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
export function createDb(
  url = process.env.DATABASE_URL || "file:./data/app.db",
) {
  const filename = resolve(url.replace(/^file:/, ""));
  mkdirSync(dirname(filename), { recursive: true });
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: `file:${filename}` }),
  });
}
const globalDb = globalThis as unknown as { invoiceDb?: PrismaClient };
export function getDb() {
  return globalDb.invoiceDb ?? (globalDb.invoiceDb = createDb());
}
