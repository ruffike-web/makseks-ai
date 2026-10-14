-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExportRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bank" TEXT NOT NULL,
    "invoiceIds" TEXT NOT NULL,
    "total" TEXT NOT NULL,
    "xmlHash" TEXT NOT NULL,
    "fingerprints" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ExportRecord" ("bank", "createdAt", "id", "invoiceIds", "total", "xmlHash") SELECT "bank", "createdAt", "id", "invoiceIds", "total", "xmlHash" FROM "ExportRecord";
DROP TABLE "ExportRecord";
ALTER TABLE "new_ExportRecord" RENAME TO "ExportRecord";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
