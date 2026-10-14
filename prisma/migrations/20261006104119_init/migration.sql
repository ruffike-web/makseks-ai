-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "data" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 0,
    "sourceFileName" TEXT NOT NULL,
    "sourceFileHash" TEXT,
    "data" TEXT NOT NULL,
    "originalData" TEXT NOT NULL,
    "provenance" TEXT NOT NULL DEFAULT '{}',
    "extractionMethod" TEXT NOT NULL,
    "extractionNote" TEXT,
    "approvedAt" DATETIME,
    "approvalContext" TEXT,
    "duplicateAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "accountChangeAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "exportedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identity" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExportRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bank" TEXT NOT NULL,
    "invoiceIds" TEXT NOT NULL,
    "total" TEXT NOT NULL,
    "xmlHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Invoice_sourceFileHash_idx" ON "Invoice"("sourceFileHash");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_identity_key" ON "Supplier"("identity");
