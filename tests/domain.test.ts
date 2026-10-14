import { describe, expect, it } from "vitest";
import {
  blankInvoice,
  defaultSettings,
  normalizeIban,
  validIban,
  validateReference,
  parseCents,
  formatCents,
  validDate,
  estoniaToday,
  effectiveDate,
  descriptionFor,
  evaluateInvoice,
  invoiceIdentity,
  groupPaymentsForExport,
} from "../src/lib/domain";

export const validInvoice = () => ({
  ...blankInvoice(),
  supplierName: "Tarnija OÜ",
  supplierIban: "EE382200221020145685",
  invoiceNumber: "INV-1",
  amountDue: "125.40",
  currency: "EUR",
  dueDate: "2026-10-20",
});
describe("payment validators", () => {
  it("identifies the missing recipient address field even when payer address is complete", () => {
    const settings = {
      ...defaultSettings(),
      address: "Testi 1",
      town: "Tallinn",
      countryCode: "EE",
    };
    const invoice = { ...validInvoice(), supplierTown: "Tartu" };
    const ctx = { today: "2026-10-06", approved: false };
    const issues = evaluateInvoice(invoice, settings, ctx).issues;
    expect(issues.find((issue) => issue.code === "ADDRESS")).toMatchObject({
      field: "supplierCountryCode",
      message:
        "SEB makse saaja aadressis puudub riigikood. Täida arve lisaandmetes saaja riigikood (Eesti puhul EE) ja salvesta muudatused.",
    });
    expect(
      evaluateInvoice(
        { ...invoice, supplierCountryCode: "EE" },
        settings,
        ctx,
      ).issues.some((issue) => issue.code === "ADDRESS"),
    ).toBe(false);
    expect(
      evaluateInvoice(
        { ...invoice, supplierTown: null, supplierCountryCode: "EE" },
        settings,
        ctx,
      ).issues.find((issue) => issue.code === "ADDRESS")?.field,
    ).toBe("supplierTown");
  });
  it("normalizes and validates complete IBAN structure and MOD97", () => {
    expect(normalizeIban(" ee38 2200 2210 2014 5685 ")).toBe(
      "EE382200221020145685",
    );
    expect(validIban("ee38 2200 2210 2014 5685")).toBe(true);
    for (const v of [
      "EE526890000000000000",
      "EE516890",
      "XX001234567890",
      "EE382200221020145685X",
    ])
      expect(validIban(v)).toBe(false);
  });
  it("validates reference length and 7-3-1 checksum without repairing it", () => {
    expect(validateReference("123 1247")).toBe(true);
    expect(validateReference("13")).toBe(true);
    for (const v of ["1231242", "1", "A123", "123456789012345678901"])
      expect(validateReference(v)).toBe(false);
  });
  it("uses exact cents and rejects non-positive, fractional cents and exponent notation", () => {
    expect(parseCents("0.01")).toBe(1n);
    expect(
      formatCents(
        parseCents("10.10")! + parseCents("20.20")! + parseCents("30.30")!,
      ),
    ).toBe("60.60");
    expect(parseCents("1 234,50")).toBe(123450n);
    for (const v of ["0", "-1", "1.234", "1e3", "1,000.00", "Infinity", ""])
      expect(parseCents(v)).toBeNull();
  });
  it("validates calendar dates and leap years", () => {
    expect(validDate("2024-02-29")).toBe(true);
    for (const v of [
      "2025-02-29",
      "2026-04-31",
      "2026-13-01",
      "2026-1-01",
      "0000-01-01",
    ])
      expect(validDate(v)).toBe(false);
  });
  it("uses Estonia local dates across midnight and DST", () => {
    expect(estoniaToday(new Date("2026-10-05T21:30:00Z"))).toBe("2026-10-06");
    expect(estoniaToday(new Date("2026-12-31T22:01:00Z"))).toBe("2027-01-01");
    expect(estoniaToday(new Date("2026-03-29T01:30:00Z"))).toBe("2026-03-29");
  });
  it("resolves overdue, today, future and explicit date modes", () => {
    const s = defaultSettings();
    expect(effectiveDate("2026-10-01", s, "2026-10-06")).toBe("2026-10-06");
    expect(effectiveDate("2026-10-06", s, "2026-10-06")).toBe("2026-10-06");
    expect(effectiveDate("2026-10-20", s, "2026-10-06")).toBe("2026-10-20");
    expect(effectiveDate(null, s, "2026-10-06")).toBeNull();
    expect(effectiveDate(null, { ...s, dateMode: "today" }, "2026-10-06")).toBe(
      "2026-10-06",
    );
    expect(
      effectiveDate(
        null,
        { ...s, dateMode: "manual", manualDate: "2026-10-01" },
        "2026-10-06",
      ),
    ).toBeNull();
  });
  it("creates descriptions and normalizes duplicate identity", () => {
    const v = validInvoice();
    expect(descriptionFor(v, defaultSettings())).toBe("Arve INV-1");
    expect(
      descriptionFor({ ...v, customerNumber: "C42" }, defaultSettings()),
    ).toBe("Arve INV-1, klient C42");
    expect(invoiceIdentity(v)).toBe(
      invoiceIdentity({
        ...v,
        supplierName: " TARNIJA  OÜ ",
        amountDue: "125,4",
        invoiceNumber: " inv-1 ",
      }),
    );
    expect(invoiceIdentity(blankInvoice())).toBeNull();
  });
});
describe("review eligibility", () => {
  it("requires human approval even with high AI confidence", () => {
    expect(
      evaluateInvoice(validInvoice(), defaultSettings(), {
        today: "2026-10-06",
      }).status,
    ).toBe("REVIEW_REQUIRED");
    expect(
      evaluateInvoice(validInvoice(), defaultSettings(), {
        today: "2026-10-06",
        approved: true,
      }).status,
    ).toBe("READY");
  });
  it("never permits invalid or missing payment data", () => {
    for (const data of [
      { supplierIban: "bad" },
      { amountDue: "-1" },
      { currency: "USD" },
      { referenceNumber: "1231242" },
      { dueDate: "2026-02-30" },
    ]) {
      expect(
        evaluateInvoice({ ...validInvoice(), ...data }, defaultSettings(), {
          today: "2026-10-06",
          approved: true,
        }).status,
      ).toBe("INVALID");
    }
    expect(
      evaluateInvoice(
        { ...validInvoice(), supplierName: null },
        defaultSettings(),
        { today: "2026-10-06", approved: true },
      ).status,
    ).toBe("REVIEW_REQUIRED");
  });
  it("does not label transfers outside SEPA as SEPA", () => {
    expect(
      evaluateInvoice(
        { ...validInvoice(), supplierIban: "AE070331234567890123456" },
        defaultSettings(),
        { today: "2026-10-06", approved: true },
      ).status,
    ).toBe("INVALID");
  });
  it("blocks unacknowledged duplicate and new bank accounts independently", () => {
    const ctx = {
      today: "2026-10-06",
      approved: true,
      duplicate: true,
      accountChanged: true,
    };
    expect(evaluateInvoice(validInvoice(), defaultSettings(), ctx).status).toBe(
      "REVIEW_REQUIRED",
    );
    expect(
      evaluateInvoice(validInvoice(), defaultSettings(), {
        ...ctx,
        duplicateAcknowledged: true,
      }).status,
    ).toBe("REVIEW_REQUIRED");
    expect(
      evaluateInvoice(validInvoice(), defaultSettings(), {
        ...ctx,
        duplicateAcknowledged: true,
        accountChangeAcknowledged: true,
      }).status,
    ).toBe("READY");
  });
  it("does not invent a town for a partial SEB address, or truncate text", () => {
    expect(
      evaluateInvoice(
        { ...validInvoice(), supplierAddress: "Pikk 1" },
        defaultSettings(),
        { today: "2026-10-06", approved: true },
      ).status,
    ).toBe("REVIEW_REQUIRED");
    expect(
      evaluateInvoice(
        { ...validInvoice(), invoiceNumber: "a".repeat(150) },
        defaultSettings(),
        { today: "2026-10-06", approved: true },
      ).status,
    ).toBe("INVALID");
  });
  it("rejects XML control characters before rendering", () => {
    expect(
      evaluateInvoice(
        { ...validInvoice(), supplierName: "Test\u0000OÜ" },
        defaultSettings(),
        { today: "2026-10-06", approved: true },
      ).status,
    ).toBe("INVALID");
  });
  it("groups by execution date only within the single payer/EUR model", () => {
    const groups = groupPaymentsForExport([
      { executionDate: "2026-10-20" },
      { executionDate: "2026-10-25" },
      { executionDate: "2026-10-20" },
    ]);
    expect(groups.size).toBe(2);
    expect(groups.get("2026-10-20")).toHaveLength(2);
  });
});
