import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { expect, it } from "vitest";
import { defaultSettings } from "../src/lib/domain";

it("preserves existing settings, invoices, suppliers and exports under the original company", () => {
  const db = new DatabaseSync(":memory:");
  try {
    for (const name of readdirSync("prisma/migrations")
      .filter((n) => /^\d/.test(n) && n < "20261007130000_multiple_companies")
      .sort())
      db.exec(readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8"));
    const settings = JSON.stringify({
      ...defaultSettings(),
      companyName: "Vana ettevõte OÜ",
      iban: "EE121010000000000016",
    });
    db.prepare(
      "INSERT INTO Settings(id,data,updatedAt) VALUES (1,?,CURRENT_TIMESTAMP)",
    ).run(settings);
    db.exec(`INSERT INTO Invoice(id,version,sourceFileName,data,originalData,extractionMethod,exportedAt,exportedVersion,updatedAt) VALUES ('invoice',7,'old.pdf','{}','{}','manual',CURRENT_TIMESTAMP,7,CURRENT_TIMESTAMP);
      INSERT INTO Supplier(id,identity,data,updatedAt) VALUES ('supplier','reg:123','{}',CURRENT_TIMESTAMP);
      INSERT INTO ExportRecord(id,bank,invoiceIds,total,xmlHash,fingerprints) VALUES ('export','SEB','["invoice"]','10.10','hash','[]');`);
    db.exec(
      readFileSync(
        "prisma/migrations/20261007130000_multiple_companies/migration.sql",
        "utf8",
      ),
    );
    expect(db.prepare("SELECT id,data FROM Settings").get()).toMatchObject({
      id: "default",
      data: settings,
    });
    for (const table of ["Invoice", "Supplier", "ExportRecord"])
      expect(
        db.prepare(`SELECT companyId FROM ${table}`).get()?.companyId,
      ).toBe("default");
    expect(
      db.prepare("SELECT version,exportedVersion FROM Invoice").get(),
    ).toMatchObject({ version: 7, exportedVersion: 7 });
    db.exec(
      `INSERT INTO Supplier(id,companyId,identity,data,updatedAt) VALUES ('second','other','reg:123','{}',CURRENT_TIMESTAMP);`,
    );
    expect(db.prepare("SELECT count(*) AS n FROM Supplier").get()?.n).toBe(2);
  } finally {
    db.close();
  }
});

it("does not infer exported versions for legacy edits even immediately after export", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(`CREATE TABLE Invoice (id TEXT, version INTEGER, exportedAt TEXT, approvedAt TEXT, updatedAt TEXT);
      CREATE TABLE ExportRecord (fingerprints TEXT, createdAt TEXT);
      INSERT INTO Invoice VALUES ('old', 4, '2026-10-07T08:00:00.000Z', NULL, '2026-10-07T08:00:00.700Z');
      INSERT INTO ExportRecord VALUES ('[{"invoiceId":"old"}]', '2026-10-07T08:00:00.000Z');`);
    db.exec(
      readFileSync(
        "prisma/migrations/20261007100000_exported_version/migration.sql",
        "utf8",
      ),
    );
    expect(
      db.prepare("SELECT exportedVersion FROM Invoice").get()?.exportedVersion,
    ).toBeNull();
  } finally {
    db.close();
  }
});
