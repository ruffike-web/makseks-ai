import { describe, expect, it } from "vitest";
import { invoiceDueAttention } from "../src/lib/invoice-attention";

describe("invoice due attention", () => {
  it.each([
    ["2026-10-22", "today"],
    ["2026-10-21", "overdue"],
    ["2025-12-31", "overdue"],
    ["2026-10-23", null],
  ] as const)("classifies a READY invoice due %s as %s", (dueDate, expected) => {
    expect(
      invoiceDueAttention({ status: "READY", data: { dueDate } }, "2026-10-22"),
    ).toBe(expected);
  });

  it.each(["EXPORTED", "INVALID", "REVIEW_REQUIRED"])(
    "does not flag an overdue invoice with status %s",
    (status) => {
      expect(
        invoiceDueAttention(
          { status, data: { dueDate: "2026-10-21" } },
          "2026-10-22",
        ),
      ).toBeNull();
    },
  );

  it.each([null, "", "invalid", "2026-02-30", "2026-2-03", "22.10.2026"])(
    "does not flag a missing or invalid due date: %s",
    (dueDate) => {
      expect(
        invoiceDueAttention({ status: "READY", data: { dueDate } }, "2026-10-22"),
      ).toBeNull();
    },
  );

  it("uses the invoice due date even when payment is scheduled later", () => {
    const invoice = {
      status: "READY",
      data: { dueDate: "2026-10-21" },
      executionDate: "2026-10-30",
    };
    expect(invoiceDueAttention(invoice, "2026-10-22")).toBe("overdue");
  });

  it("does not change invoice data, status or approval", () => {
    const invoice = Object.freeze({
      status: "READY",
      approved: true,
      data: Object.freeze({ dueDate: "2026-10-22" }),
    });
    expect(invoiceDueAttention(invoice, "2026-10-22")).toBe("today");
    expect(invoice).toEqual({
      status: "READY",
      approved: true,
      data: { dueDate: "2026-10-22" },
    });
  });
});
