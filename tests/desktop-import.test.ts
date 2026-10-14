import { createRequire } from "node:module";
import { cpSync, mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { migrate, importDatabase } = require("../desktop/bootstrap.cjs");
const migrations = resolve("prisma/migrations");

it.each([
  ["Settings", "data"],
  ["Invoice", "accountCandidates"],
])("rejects an imported database missing %s.%s without replacing current data", async (table, column) => {
  const directory = mkdtempSync(join(tmpdir(), "arve-import-schema-"));
  const source = join(directory, "source.db");
  const target = join(directory, "target.db");
  await migrate(source, migrations);
  await migrate(target, migrations);
  const current = new DatabaseSync(target);
  current.prepare("UPDATE Settings SET data = ? WHERE id = 'default'").run(
    JSON.stringify({ companyName: "Keep current company" }),
  );
  current.close();
  const incoming = new DatabaseSync(source);
  incoming.exec(`ALTER TABLE "${table}" DROP COLUMN "${column}"`);
  incoming.close();

  await expect(importDatabase(source, target, migrations)).rejects.toThrow();

  const preserved = new DatabaseSync(target, { readOnly: true });
  try {
    expect(preserved.prepare("SELECT data FROM Settings WHERE id = 'default'").get()!.data)
      .toBe('{"companyName":"Keep current company"}');
  } finally {
    preserved.close();
  }
  expect(readdirSync(directory).some((name) => name.includes(".import-"))).toBe(false);
});

it("imports and upgrades a legitimate database from before company profiles", async () => {
  const directory = mkdtempSync(join(tmpdir(), "arve-import-legacy-"));
  const legacyMigrations = join(directory, "legacy-migrations");
  mkdirSync(legacyMigrations);
  const firstMigration = "20261006104119_init";
  cpSync(join(migrations, firstMigration), join(legacyMigrations, firstMigration), { recursive: true });
  const source = join(directory, "legacy.db");
  const target = join(directory, "target.db");
  await migrate(source, legacyMigrations);
  await migrate(target, migrations);
  const incoming = new DatabaseSync(source);
  incoming.prepare("INSERT INTO Settings (id, data, updatedAt) VALUES (1, ?, CURRENT_TIMESTAMP)")
    .run('{"companyName":"Legacy company"}');
  incoming.close();

  await importDatabase(source, target, migrations);

  const imported = new DatabaseSync(target, { readOnly: true });
  try {
    expect(imported.prepare("SELECT data FROM Settings WHERE id = 'default'").get()!.data)
      .toBe('{"companyName":"Legacy company"}');
    expect(() => imported.prepare("SELECT companyId, accountCandidates FROM Invoice").all())
      .not.toThrow();
  } finally {
    imported.close();
  }
});
