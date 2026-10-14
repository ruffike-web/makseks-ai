import { z } from "zod";
import {
  normalizedName,
  normalizeIban,
  validIban,
  type InvoiceData,
} from "./domain";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => v || null);
export const supplierSchema = z.object({
  name: z.string().trim().min(1).max(140),
  registrationCode: optional(35),
  trustedIbans: z
    .array(z.string().transform(normalizeIban).refine(validIban, "Vigane IBAN"))
    .min(1)
    .max(20),
  bic: optional(11),
  address: optional(70),
  street: optional(70),
  buildingNumber: optional(16),
  postalCode: optional(16),
  town: optional(35),
  countryCode: optional(2).refine(
    (v) => !v || /^[A-Z]{2}$/.test(v),
    "Kasuta kahetähelist riigikoodi",
  ),
});
export type SupplierData = z.infer<typeof supplierSchema> & { id: string };

export function supplierIdentityConflict(i: InvoiceData, suppliers: SupplierData[]) {
  // An explicit saved registration match already preserves account differences
  // for the existing account-change review. Unknown OCR names are not conflicts.
  if (i.supplierRegistrationCode && suppliers.some((s) => s.registrationCode === i.supplierRegistrationCode)) return false;
  const names = suppliers.filter((s) => i.supplierName && normalizedName(s.name) === normalizedName(i.supplierName));
  const accounts = suppliers.filter((s) => i.supplierIban && s.trustedIbans.includes(i.supplierIban));
  return names.length === 1 && accounts.length === 1 && names[0].id !== accounts[0].id;
}

export function matchSupplier(i: InvoiceData, suppliers: SupplierData[]) {
  if (supplierIdentityConflict(i, suppliers)) return null;
  const reg = suppliers.filter(
    (s) =>
      i.supplierRegistrationCode &&
      s.registrationCode === i.supplierRegistrationCode,
  );
  if (reg.length)
    return reg.length === 1 ? { supplier: reg[0], strong: true } : null;
  const compatible = suppliers.filter(
    (s) =>
      !(
        i.supplierRegistrationCode &&
        s.registrationCode &&
        i.supplierRegistrationCode !== s.registrationCode
      ),
  );
  const accounts = compatible.filter(
    (s) => i.supplierIban && s.trustedIbans.includes(i.supplierIban),
  );
  if (accounts.length)
    return accounts.length === 1
      ? { supplier: accounts[0], strong: true }
      : null;
  const names = compatible.filter(
    (s) =>
      i.supplierName &&
      normalizedName(s.name) === normalizedName(i.supplierName),
  );
  return names.length === 1 ? { supplier: names[0], strong: false } : null;
}

export function supplierValues(s: SupplierData, invoice: InvoiceData) {
  const accounts = [...new Set(s.trustedIbans)];
  const iban = invoice.supplierIban || (accounts.length === 1 ? accounts[0] : null);
  return {
    supplierName: s.name,
    supplierRegistrationCode: s.registrationCode,
    supplierAddress: s.address,
    supplierStreet: s.street,
    supplierBuildingNumber: s.buildingNumber,
    supplierPostalCode: s.postalCode,
    supplierTown: s.town,
    supplierCountryCode: s.countryCode,
    supplierIban: invoice.supplierIban ? null : iban,
    supplierBic: iban && accounts.length === 1 && accounts[0] === iban ? s.bic : null,
    // Preserve a printed account discrepancy; never guess between saved accounts.
  };
}
