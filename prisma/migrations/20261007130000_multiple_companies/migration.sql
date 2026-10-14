-- Settings rows are company profiles. Preserve the original profile verbatim.
CREATE TABLE "new_Settings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "data" TEXT NOT NULL,
  "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("id", "data", "updatedAt")
SELECT 'default', "data", "updatedAt" FROM "Settings" WHERE "id" = 1;
INSERT OR IGNORE INTO "new_Settings" ("id", "data", "updatedAt") VALUES (
  'default', '{"companyName":"","registrationCode":"","iban":"","bic":"","address":"","postalCode":"","town":"","countryCode":"","defaultCurrency":"EUR","preferredBank":"SEB","dateMode":"due","manualDate":"","descriptionTemplate":"Arve {invoiceNumber}","customerDescriptionTemplate":"Arve {invoiceNumber}, klient {customerNumber}","aiEnabled":false}', CURRENT_TIMESTAMP
);
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";

ALTER TABLE "Invoice" ADD COLUMN "companyId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Supplier" ADD COLUMN "companyId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "ExportRecord" ADD COLUMN "companyId" TEXT NOT NULL DEFAULT 'default';
DROP INDEX "Supplier_identity_key";
CREATE UNIQUE INDEX "Supplier_companyId_identity_key" ON "Supplier" ("companyId", "identity");
CREATE INDEX "Invoice_companyId_idx" ON "Invoice" ("companyId");
CREATE INDEX "ExportRecord_companyId_idx" ON "ExportRecord" ("companyId");
