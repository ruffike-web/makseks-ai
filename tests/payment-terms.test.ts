import { describe, expect, it } from "vitest";
import {
  blankInvoice,
  defaultSettings,
  dueDateFromPaymentTerms,
  evaluateInvoice,
  invoiceSchema,
  normalizeInvoice,
  updateInvoiceField,
} from "../src/lib/domain";
import { extractLocalInvoice } from "../src/lib/local-extraction";
import { extractLayoutInvoice } from "../src/lib/layout-extraction";
import { parseExtractionResponse } from "../src/lib/extraction";
import type { PdfLine } from "../src/lib/pdf-layout";

const layout = (rows: string[][]): PdfLine[] => rows.map((row, index) => ({
  page: 1, y: 40 + index * 18,
  cells: row.map((text, col) => ({ text, x: 40 + col * 220, y: 40 + index * 18, width: 160, height: 10 })),
}));

describe("calendar-day payment terms", () => {
  it.each([
    ["2026-10-27", "14", "2026-11-10"],
    ["2024-02-28", "1", "2024-02-29"],
    ["2025-02-28", "1", "2025-03-01"],
    ["2026-12-31", "30", "2027-01-30"],
    ["2026-03-28", "2", "2026-03-30"],
    ["2026-10-24", "2", "2026-10-26"],
    ["2026-10-27", "0", "2026-10-27"],
  ])("adds %s + %s without time-zone drift", (date, days, expected) => {
    expect(dueDateFromPaymentTerms(date, days)).toBe(expected);
  });

  it("requires a real invoice date and a non-negative whole number of days", () => {
    for (const days of [null, "", "-1", "1.5", "1e2", "14 days", "999999999999999999999"]) {
      expect(dueDateFromPaymentTerms("2026-10-27", days)).toBeNull();
    }
    for (const date of [null, "", "2025-02-29", "27/10/2026"]) {
      expect(dueDateFromPaymentTerms(date, "14")).toBeNull();
    }
    expect(dueDateFromPaymentTerms("9999-12-31", "1")).toBeNull();
  });

  it("derives a missing deadline but preserves an explicit deadline and old saved invoices", () => {
    const invoice = { ...blankInvoice(), invoiceDate: "2026-10-27", paymentTermDays: "14" };
    expect(normalizeInvoice(invoice).dueDate).toBe("2026-11-10");
    expect(normalizeInvoice({ ...invoice, dueDate: "2026-11-15" }).dueDate).toBe("2026-11-15");
    const legacy = { ...blankInvoice() };
    delete (legacy as Partial<typeof legacy>).paymentTermDays;
    expect(invoiceSchema.parse(legacy).paymentTermDays).toBeNull();
  });

  it("rejects invalid day counts during review even when a deadline was entered", () => {
    const invoice = { ...blankInvoice(), paymentTermDays: "1.5", dueDate: "2026-11-15" };
    expect(evaluateInvoice(invoice, defaultSettings(), { today: "2026-10-28", approved: true }).issues)
      .toContainEqual(expect.objectContaining({ code: "PAYMENT_TERMS", field: "paymentTermDays", severity: "error" }));
  });

  it("updates a derived deadline when inputs change and retains manual overrides", () => {
    const invoice = normalizeInvoice({ ...blankInvoice(), invoiceDate: "2026-10-27", paymentTermDays: "14" });
    expect(updateInvoiceField(invoice, "invoiceDate", "2026-10-28").dueDate).toBe("2026-11-11");
    expect(updateInvoiceField(invoice, "paymentTermDays", "30").dueDate).toBe("2026-11-26");
    expect(updateInvoiceField(invoice, "paymentTermDays", "").dueDate).toBeNull();
    expect(updateInvoiceField(invoice, "invoiceDate", "").dueDate).toBeNull();
    const overridden = updateInvoiceField(invoice, "dueDate", "2026-11-20");
    expect(updateInvoiceField(overridden, "paymentTermDays", "30").dueDate).toBe("2026-11-20");
    expect(updateInvoiceField(overridden, "invoiceDate", "2026-10-28").dueDate).toBe("2026-11-20");
  });

  it.each(["Maksetähtaeg: 14 päeva", "Tasumistingimus: 14 kalendripäeva", "Payment terms: Net 14", "Payment terms: 14 days", "Maksetähtaeg (päevades): 14"])(
    "reads plain-text terms: %s", (line) => {
      expect(extractLocalInvoice(`Arve kuupäev: 27.10.2026\n${line}`)).toMatchObject({
        invoiceDate: "2026-10-27", paymentTermDays: "14", dueDate: "2026-11-10",
      });
    },
  );

  it("reads payment terms in PDF columns and gives explicit date priority", () => {
    expect(extractLayoutInvoice(layout([["Invoice date", "2026-10-27"], ["Payment terms", "Net 30"]])).data)
      .toMatchObject({ invoiceDate: "2026-10-27", paymentTermDays: "30", dueDate: "2026-11-26" });
    expect(extractLayoutInvoice(layout([["Arve kuupäev: 27.10.2026"], ["Maksetähtaeg: 14 päeva"], ["Due date: 2026-11-15"]])).data.dueDate)
      .toBe("2026-11-15");
    expect(extractLocalInvoice("Invoice date: 2026-10-27\nPayment terms: Net30\nDue date: 2026-11-15").dueDate)
      .toBe("2026-11-15");
  });

  it.each(["14 business days", "14 tööpäeva", "1 month", "14 days from delivery", "14 / 30 days", "-14 days", "2.5 days"])(
    "does not reinterpret ambiguous or non-calendar terms: %s", (terms) => {
      expect(extractLocalInvoice(`Invoice date: 2026-10-27\nPayment terms: ${terms}`).dueDate).toBeNull();
      expect(extractLayoutInvoice(layout([["Invoice date: 2026-10-27"], [`Payment terms: ${terms}`]])).data.dueDate).toBeNull();
    },
  );

  it("does not derive from missing invoice dates, conflicting terms or conflicting explicit dates", () => {
    expect(extractLocalInvoice("Payment terms: Net30").dueDate).toBeNull();
    for (const rows of [
      ["Invoice date: 2026-10-27", "Payment terms: Net14", "Payment terms: Net30"],
      ["Invoice date: 2026-10-27", "Payment terms: Net14", "Due date: 2026-11-01", "Due date: 2026-11-02"],
      ["Invoice date: 2026-10-27", "Payment terms: Net14", "Due date: 31.02.2026"],
      ["Invoice date: 2026-10-27", "Payment terms: Net14", "Due date: not readable"],
    ]) {
      expect(normalizeInvoice(extractLocalInvoice(rows.join("\n"))).dueDate).toBeNull();
      expect(normalizeInvoice(extractLayoutInvoice(layout(rows.map(row => [row]))).data).dueDate).toBeNull();
    }
  });

  it("calculates AI-extracted days in application code rather than asking the model to calculate", () => {
    const invoice = { ...blankInvoice(), invoiceDate: "2026-10-27", paymentTermDays: "14" };
    expect(parseExtractionResponse(JSON.stringify(invoice)).dueDate).toBe("2026-11-10");
    expect(parseExtractionResponse(JSON.stringify({ ...invoice, dueDate: "2026-11-20" })).dueDate).toBe("2026-11-20");
  });
});
