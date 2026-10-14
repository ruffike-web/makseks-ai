import { expect, it } from "vitest";
import { blankInvoice } from "../src/lib/domain";
import {
  matchSupplier,
  supplierValues,
  supplierSchema,
  type SupplierData,
} from "../src/lib/suppliers";

const supplier: SupplierData = {
  id: "1",
  name: "Õige OÜ",
  registrationCode: "123",
  trustedIbans: ["EE382200221020145685"],
  bic: null,
  address: null,
  street: null,
  buildingNumber: null,
  postalCode: null,
  town: "Tartu",
  countryCode: "EE",
};
it("does not resolve a shared account or conflicting registration code automatically", () => {
  const invoice = {
    ...blankInvoice(),
    supplierName: "vale nimi",
    supplierIban: supplier.trustedIbans[0],
  };
  expect(
    matchSupplier(invoice, [
      supplier,
      { ...supplier, id: "2", registrationCode: "456" },
    ]),
  ).toBeNull();
  expect(
    matchSupplier({ ...invoice, supplierRegistrationCode: "456" }, [supplier]),
  ).toBeNull();
  expect(
    matchSupplier({ ...invoice, supplierRegistrationCode: "123" }, [supplier])
      ?.strong,
  ).toBe(true);
});
it("fills only an unambiguous missing account and preserves a different printed bank", () => {
  const saved = { ...supplier, bic: "HABAEE2X" };
  expect(supplierValues(saved, blankInvoice())).toMatchObject({ supplierIban: supplier.trustedIbans[0], supplierBic: "HABAEE2X" });
  expect(supplierValues(saved, { ...blankInvoice(), supplierIban: "EE121010000000000016", supplierBic: "EEUHEE2X" })).toMatchObject({ supplierIban: null, supplierBic: null });
  expect(supplierValues({ ...saved, trustedIbans: [...saved.trustedIbans, "EE121010000000000016"] }, blankInvoice())).toMatchObject({ supplierIban: null, supplierBic: null });
});
it("normalizes account edits and rejects invalid trusted accounts", () => {
  expect(
    supplierSchema.parse({
      ...supplier,
      trustedIbans: ["ee38 2200 2210 2014 5685"],
    }).trustedIbans,
  ).toEqual(supplier.trustedIbans);
  expect(() =>
    supplierSchema.parse({ ...supplier, trustedIbans: ["bad"] }),
  ).toThrow();
});
it("does not resolve two saved suppliers with the same name or a conflicting registration code", () => {
  const invoice = { ...blankInvoice(), supplierName: supplier.name };
  expect(matchSupplier(invoice, [supplier, { ...supplier, id: "2", registrationCode: "456" }])).toBeNull();
  expect(matchSupplier({ ...invoice, supplierRegistrationCode: "456" }, [supplier])).toBeNull();
});
