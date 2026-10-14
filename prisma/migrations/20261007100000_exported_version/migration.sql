ALTER TABLE "Invoice" ADD COLUMN "exportedVersion" INTEGER;
-- Legacy export records do not contain an exact invoice version.
-- Do not infer an unchanged version from timestamp proximity.
