import { expect, it, vi } from "vitest";
import { extractLocalInvoice } from "../src/lib/local-extraction";
import { extractInvoice } from "../src/lib/extraction";
import { invoicePdf } from "./pdf-fixture";

const text = `Müüja: Tarnija OÜ
Registrikood: 12345678
IBAN: EE382200221020145685
Ostja: Maksja OÜ
Registrikood: 87654321
IBAN: EE121010000000000016
Arve nr: A-2026/42
Arve kuupäev: 13.10.2026
Maksetähtpäev: 27.10.2026
Vahesumma: 1000,00 EUR
Käibemaks: 240,00 EUR
Kokku: 1240,00 EUR
Tasutud: 200,00 EUR
Tasuda: 1 040,00 EUR
Viitenumber: 12345`;
it("reads labelled Estonian payment fields and distinguishes buyer and supplier", () => {
  const result = extractLocalInvoice(text, { companyName: "Maksja OÜ", iban: "EE121010000000000016", registrationCode: "87654321" });
  expect(result).toMatchObject({ supplierName: "Tarnija OÜ", supplierRegistrationCode: "12345678", supplierIban: "EE382200221020145685", invoiceNumber: "A-2026/42", invoiceDate: "2026-10-13", dueDate: "2026-10-27", amountDue: "1040.00", currency: "EUR", referenceNumber: "12345" });
  expect(result.supplierTown).toBeNull();
  expect(result.confidence.amountDue).toBeLessThan(0.9);
});
it("reads English labels, grouped amounts and ISO dates", () => {
  expect(extractLocalInvoice("Supplier: Example Ltd\nInvoice no: INV-1\nDue date: 2026-11-02\nAmount due: EUR 1,234.56")).toMatchObject({ supplierName: "Example Ltd", invoiceNumber: "INV-1", amountDue: "1234.56", currency: "EUR", dueDate: "2026-11-02" });
});
it("leaves conflicting amounts, accounts, dates and unknown values empty", () => {
  const result = extractLocalInvoice("IBAN: EE382200221020145685\nIBAN: EE121010000000000016\nTasuda: 123,00 EUR\nTasuda: 124,00 EUR\nMaksetähtpäev: 31.02.2026\nInvoice date: 01/02/2026");
  expect(result.supplierIban).toBeNull(); expect(result.amountDue).toBeNull();
  expect(result.dueDate).toBeNull(); expect(result.invoiceDate).toBeNull();
  expect(result.supplierName).toBeNull();
  expect(extractLocalInvoice("Kokku: 124 EUR\nTasutud: 20 EUR").amountDue).toBeNull();
  expect(extractLocalInvoice("Amount due: 1,234 EUR").amountDue).toBeNull();
  for (const heading of ["Invoice date", "Invoice no", "Invoice number", "Arve nr"]) expect(extractLocalInvoice(heading).invoiceNumber).toBeNull();
});
it("never substitutes the payer or takes buyer bank details", () => {
  const result = extractLocalInvoice("Supplier: Maksja OÜ\nIBAN: EE382200221020145685\nBuyer: Customer Ltd\nIBAN: EE121010000000000016", { companyName: "Maksja OÜ", iban: "EE382200221020145685", registrationCode: "" });
  expect(result.supplierName).toBeNull(); expect(result.supplierIban).toBeNull();
});
it("explicit local and manual modes never call a configured AI provider", async () => {
  const provider = { extract: vi.fn(() => { throw new Error("Network must not be used"); }) };
  const local = await extractInvoice(invoicePdf(["Supplier: Example Ltd", "Invoice no: TEST-LOCAL", "Amount due: EUR 104.00", "Due date: 2030-10-20"]), "application/pdf", provider, { mode: "local" });
  expect(local.method).toBe("pdf-text-local");
  expect(local.data).toMatchObject({ amountDue: "104.00", dueDate: "2030-10-20", invoiceNumber: "TEST-LOCAL", supplierName: "Example Ltd" });
  const manual = await extractInvoice(invoicePdf(), "application/pdf", provider, { mode: "manual" });
  expect(manual.method).toBe("manual"); expect(manual.data.amountDue).toBeNull();
  expect(provider.extract).not.toHaveBeenCalled();
});
it("does not ignore an unreadable conflicting amount or use inconsistent currencies", () => {
  expect(extractLocalInvoice("Amount due: EUR 104.00\nAmount due: EUR ???").amountDue).toBeNull();
  expect(extractLocalInvoice("Amount due: EUR 104.00\nCurrency: USD").amountDue).toBeNull();
});
it("keeps image, empty PDF and unsupported text imports available for manual review", async () => {
  for (const [bytes, mime] of [[Buffer.from("image"), "image/png"], [invoicePdf([]), "application/pdf"], [invoicePdf(["Some document without payment labels"]), "application/pdf"]] as const) {
    const result = await extractInvoice(bytes, mime, null, { mode: "local" });
    expect(result.method).toBe("manual"); expect(result.note).toContain("käsitsi");
    expect(result.data.amountDue).toBeNull();
  }
});
