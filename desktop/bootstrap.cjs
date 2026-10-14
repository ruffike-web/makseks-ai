const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync, backup } = require("node:sqlite");
const { createHash, randomUUID } = require("node:crypto");

async function migrate(filename, directory) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const exists = fs.existsSync(filename) && fs.statSync(filename).size > 0;
  const db = new DatabaseSync(filename);
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS _prisma_migrations (
      id TEXT PRIMARY KEY NOT NULL, checksum TEXT NOT NULL, finished_at DATETIME,
      migration_name TEXT NOT NULL, logs TEXT, rolled_back_at DATETIME,
      started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, applied_steps_count INTEGER NOT NULL DEFAULT 0);`);
    const applied = new Set(
      db
        .prepare(
          "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL",
        )
        .all()
        .map((r) => r.migration_name),
    );
    if (
      db
        .prepare(
          "SELECT count(*) AS n FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL",
        )
        .get().n
    )
      throw new Error("Andmebaasis on lõpetamata uuendus. Taasta varukoopia.");
    const pending = fs
      .readdirSync(directory)
      .filter((n) => /^\d/.test(n) && !applied.has(n))
      .sort();
    if (pending.length && exists) {
      const folder = path.join(path.dirname(filename), "backups");
      fs.mkdirSync(folder, { recursive: true });
      await backup(db, path.join(folder, `before-update-${Date.now()}.db`));
    }
    for (const name of pending) {
      const sql = fs.readFileSync(
        path.join(directory, name, "migration.sql"),
        "utf8",
      );
      db.exec("BEGIN IMMEDIATE");
      try {
        db.exec(sql);
        db.prepare(
          "INSERT INTO _prisma_migrations (id,checksum,migration_name,finished_at,applied_steps_count) VALUES (?,?,?,?,1)",
        ).run(
          randomUUID(),
          createHash("sha256").update(sql).digest("hex"),
          name,
          new Date().toISOString(),
        );
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    }
  } finally {
    db.close();
  }
}
function validateImportedSchema(filename) {
  // Migration history is supplied by the imported file, so it cannot prove
  // that the columns required by the current application actually exist.
  const required = {
    Settings: ["id", "data", "updatedAt"],
    Invoice: [
      "id", "companyId", "version", "sourceFileName", "sourceFileHash", "data",
      "originalData", "provenance", "extractionMethod", "extractionNote",
      "accountCandidates", "approvedAt", "approvalContext", "duplicateAcknowledged",
      "accountChangeAcknowledged", "exportedAt", "exportedVersion", "archivedAt",
      "createdAt", "updatedAt",
    ],
    Supplier: ["id", "identity", "companyId", "data", "createdAt", "updatedAt"],
    ExportRecord: [
      "id", "companyId", "bank", "invoiceIds", "total", "xmlHash", "fingerprints",
      "createdAt",
    ],
  };
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    for (const [table, columns] of Object.entries(required)) {
      const actual = new Set(
        db.prepare("SELECT name FROM pragma_table_info(?)").all(table).map((row) => row.name),
      );
      if (columns.some((column) => !actual.has(column)))
        throw new Error("Imporditava andmebaasi struktuur ei sobi selle rakendusega.");
    }
  } finally {
    db.close();
  }
}
async function importDatabase(source, target, migrations) {
  if (path.resolve(source) === path.resolve(target))
    throw new Error("See andmebaas on juba kasutusel.");
  const incoming = new DatabaseSync(source, { readOnly: true });
  const temporary = `${target}.import-${randomUUID()}`;
  try {
    if (
      incoming.prepare("PRAGMA integrity_check").get().integrity_check !== "ok"
    )
      throw new Error("Vigane andmebaas.");
    for (const name of [
      "Invoice",
      "Supplier",
      "Settings",
      "ExportRecord",
      "_prisma_migrations",
    ])
      if (
        !incoming
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
          )
          .get(name)
      )
        throw new Error("See ei ole Arve makseks andmebaas.");
    await backup(incoming, temporary);
  } finally {
    incoming.close();
  }
  try {
    await migrate(temporary, migrations);
    validateImportedSchema(temporary);
    if (fs.existsSync(target)) {
      const db = new DatabaseSync(target);
      const folder = path.join(path.dirname(target), "backups");
      fs.mkdirSync(folder, { recursive: true });
      try {
        if (db.prepare("PRAGMA wal_checkpoint(TRUNCATE)").get().busy)
          throw new Error("Andmebaas on teises programmis avatud.");
        await backup(db, path.join(folder, `before-import-${Date.now()}.db`));
      } finally {
        db.close();
      }
    }
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
async function start() {
  const directory = process.env.ARVE_DATA_DIR;
  if (!directory || !path.isAbsolute(directory))
    throw new Error("Andmekausta asukoht puudub.");
  fs.mkdirSync(directory, { recursive: true });
  const filename = path.join(directory, "app.db");
  const migrations = path.join(__dirname, "migrations");
  if (process.argv[2] === "--import") {
    await importDatabase(process.argv[3], filename, migrations);
    return;
  }
  await migrate(filename, migrations);
  process.env.DATABASE_URL = `file:${filename.replaceAll("\\", "/")}`;
  process.env.NEXT_TELEMETRY_DISABLED = "1";
  process.env.ARVE_DESKTOP = "1";
  process.chdir(__dirname);
  await import(
    require("node:url").pathToFileURL(path.join(__dirname, "server.js")).href
  );
  // Exit if the desktop parent disappears, including abnormal termination.
  const parent = Number(process.env.ARVE_PARENT_PID);
  if (parent)
    setInterval(() => {
      try {
        process.kill(parent, 0);
      } catch {
        process.exit(0);
      }
    }, 2000).unref();
}
module.exports = { migrate, importDatabase };
if (require.main === module)
  start().catch(() => {
    console.error("Rakenduse andmebaasi või serveri käivitamine ebaõnnestus.");
    process.exitCode = 1;
  });
