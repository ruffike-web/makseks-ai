import { createRequire } from "node:module";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
const require = createRequire(import.meta.url);
const { migrate, importDatabase } = require("../desktop/bootstrap.cjs");
it("initializes desktop databases, preserves profiles on restart and safely imports a copy", async () => {
  const dir = mkdtempSync(join(tmpdir(), "arve-desktop-"));
  const migrations = resolve("prisma/migrations");
  const source = join(dir, "source.db"),
    target = join(dir, "target.db");
  await migrate(source, migrations);
  const db = new DatabaseSync(source);
  const original = db
    .prepare("SELECT data FROM Settings WHERE id='default'")
    .get()!.data as string;
  db.prepare("UPDATE Settings SET data=? WHERE id='default'").run(
    JSON.stringify({ ...JSON.parse(original), companyName: "Desktop test OÜ" }),
  );
  db.close();
  await migrate(source, migrations);
  await migrate(target, migrations);
  await importDatabase(source, target, migrations);
  const copied = new DatabaseSync(target, { readOnly: true });
  expect(
    JSON.parse(
      copied.prepare("SELECT data FROM Settings WHERE id='default'").get()!
        .data as string,
    ).companyName,
  ).toBe("Desktop test OÜ");
  copied.close();
  expect(
    readdirSync(join(dir, "backups")).some((n) =>
      n.startsWith("before-import"),
    ),
  ).toBe(true);
  const wrong = new DatabaseSync(join(dir, "wrong.db"));
  wrong.exec("CREATE TABLE unrelated (id INTEGER)");
  wrong.close();
  await expect(
    importDatabase(join(dir, "wrong.db"), target, migrations),
  ).rejects.toThrow();
});
