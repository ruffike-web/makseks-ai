import { describe, expect, it } from "vitest";
import { XMLParser } from "fast-xml-parser";
import { bankAdapters } from "../src/lib/banks";
import { blankInvoice, defaultSettings, evaluateInvoice, freeTextReference, toPayment } from "../src/lib/domain";

// Synthetic MOD-97 creditor reference (divisible by 97, fails 7-3-1), as used by some Nordic invoicers.
const mod97Reference = "64056889181060212906";
const settings = { ...defaultSettings(), companyName: "Näidisettevõte OÜ", iban: "EE121010000000000016", bic: "EEUHEE2X" };
const foreignInvoice = () => ({
  ...blankInvoice(),
  supplierName: "Foreign Logistics Oy",
  supplierIban: "FI2112345600000785",
  supplierTown: "Helsinki",
  supplierCountryCode: "FI",
  invoiceNumber: "1060212906",
  customerNumber: "6405688918",
  referenceNumber: mod97Reference,
  amountDue: "173.50",
  currency: "EUR",
  dueDate: "2026-11-16",
});
const ctx = { today: "2026-11-09", approved: true };

describe("non-7-3-1 references on foreign accounts", () => {
  it("keeps the payment exportable and moves the reference into the description", () => {
    const result = evaluateInvoice(foreignInvoice(), settings, ctx);
    expect(result.status).toBe("READY");
    expect(result.issues.map((i) => i.code)).toContain("REFERENCE_TEXT");
    expect(result.issues.map((i) => i.code)).not.toContain("REFERENCE");
    expect(result.description).toBe(`Ref ${mod97Reference}, Arve 1060212906, klient 6405688918`);
    const payment = toPayment("x", foreignInvoice(), settings, ctx);
    expect(payment.referenceNumber).toBeNull();
    expect(payment.description).toContain(mod97Reference);
  });
  it.each(["SEB", "LHV"] as const)("%s export sends it as unstructured text, not as a SCOR reference", (bank) => {
    const payer = { ...settings, preferredBank: bank, iban: bank === "LHV" ? "EE337700771001260958" : settings.iban, bic: bank === "LHV" ? "LHVBEE22" : settings.bic };
    const xml = bankAdapters[bank].buildPaymentFile([toPayment("x", foreignInvoice(), payer, ctx)], payer, { now: new Date("2026-11-09T08:00:00Z"), id: "ref1" });
    const tx = new XMLParser({ parseTagValue: false }).parse(xml).Document.CstmrCdtTrfInitn.PmtInf.CdtTrfTxInf;
    expect(tx.RmtInf.Ustrd).toBe(`Ref ${mod97Reference}, Arve 1060212906, klient 6405688918`);
    expect(tx.RmtInf.Strd).toBeUndefined();
  });
  it("keeps the strict 7-3-1 rule for Estonian accounts and valid references stay structured", () => {
    const estonian = { ...foreignInvoice(), supplierIban: "EE382200221020145685", supplierCountryCode: "EE", supplierTown: "Tallinn" };
    expect(evaluateInvoice(estonian, settings, ctx).status).toBe("INVALID");
    expect(freeTextReference(estonian)).toBeNull();
    expect(freeTextReference({ ...foreignInvoice(), referenceNumber: "1231247" })).toBeNull();
    expect(freeTextReference({ ...foreignInvoice(), referenceNumber: "RF18539007547034" })).toBeNull();
    expect(evaluateInvoice({ ...foreignInvoice(), referenceNumber: "1231247" }, settings, ctx).description).toBe("Arve 1060212906, klient 6405688918");
  });
});
