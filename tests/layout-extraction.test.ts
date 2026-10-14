import { expect, it } from "vitest";
import { extractLayoutInvoice } from "../src/lib/layout-extraction";
import type { PdfLine } from "../src/lib/pdf-layout";
const lines = (rows: string[][]): PdfLine[] =>
  rows.map((cells, index) => ({
    page: 1,
    y: 40 + index * 15,
    cells: cells.map((text, col) => ({
      text,
      x: 40 + col * 240,
      y: 40 + index * 15,
      width: 120,
      height: 10,
    })),
  }));
it("reads columns and issuer details without including adjacent invoice labels", () => {
  const result = extractLayoutInvoice(
    lines([
      ["Tarnija: Example OÜ", "Arve nr: AA-314"],
      ["Reg. nr.: 12345678", "Kliendi nr . 42"],
      ["Kontonumber: EE382200221020145685", "Kuupäev: 13.10.2026"],
      ["", "Maksekuupäev: 27.10.2026"],
      ["Kokku tasuda (EUR)", "150.82"],
      ["Saldo seisuga 13.10.2026 (EUR)", "0.00"],
      ["SWIFT: HABAEE2X"],
    ]),
  );
  expect(result.data).toMatchObject({
    supplierName: "Example OÜ",
    supplierRegistrationCode: "12345678",
    supplierIban: "EE382200221020145685",
    supplierBic: "HABAEE2X",
    invoiceNumber: "AA-314",
    customerNumber: "42",
    invoiceDate: "2026-10-13",
    dueDate: "2026-10-27",
    amountDue: "150.82",
    currency: "EUR",
  });
});
it("retains multiple printed accounts for user choice and prefers explicit due over totals", () => {
  const result = extractLayoutInvoice(
    lines([
      ["Supplier: Seller Ltd"],
      ["Bank: EE382200221020145685"],
      ["Bank: EE121010000000000016"],
      ["KUULUB TASUMISELE:", "111.35 EUR"],
      ["ARVE KOKKU", "111.36 EUR"],
    ]),
  );
  expect(result.accountCandidates).toEqual([
    "EE382200221020145685",
    "EE121010000000000016",
  ]);
  expect(result.data.supplierIban).toBeNull();
  expect(result.data.amountDue).toBe("111.35");
});
it("does not treat buyer accounts, subtotal, hidden metadata or ambiguous precision as a payment", () => {
  const result = extractLayoutInvoice(
    lines([
      ["Maksja: Buyer OÜ"],
      ["IBAN: EE382200221020145685"],
      ["Kokku", "124.00 EUR"],
      ["Tasutud", "20.00 EUR"],
      ['DFC_Amount:"999.00"'],
    ]),
  );
  expect(result.data.amountDue).toBeNull();
  expect(result.data.supplierIban).toBeNull();
  expect(
    extractLayoutInvoice(lines([["Kokku", "126,170"]])).data.amountDue,
  ).toBeNull();
});
it("recognizes an unlabeled issuer beside registry data and ignores footer prose", () => {
  const layout = lines([
    ["Arve-saateleht INV-123", "13.10.2026"],
    ["Example Cargo OÜ", "Reg.Nr 1234567"],
    ["Maksja Buyer OÜ"],
    ["Tähtaeg 27.10.2026"],
    ["Tasuda EUR", "167,40"],
    ["Arve tasumisel märkige arve number."],
    ["Arvete hilinemisel lisandub viivis."],
  ]);
  layout[1].cells[1].y -= 0.001;
  const result = extractLayoutInvoice(layout, {
    companyName: "Buyer OÜ",
    registrationCode: "",
    iban: "",
  });
  expect(result.data).toMatchObject({
    supplierName: "Example Cargo OÜ",
    supplierRegistrationCode: "1234567",
    invoiceNumber: "INV-123",
    invoiceDate: "2026-10-13",
    dueDate: "2026-10-27",
    amountDue: "167.40",
  });
});
it("finds a footer issuer but does not read a second-page subtotal as amount due", () => {
  const layout = lines([
    ["KUULUB TASUMISELE: 111.35 EUR"],
    [
      "Example Services AS, Main road 3, Tel: 1234567, REG nr: 12345678, KMKR nr: EE123456789",
    ],
  ]);
  layout.push({ ...lines([["KOKKU", "111.36"]])[0], page: 2 });
  expect(extractLayoutInvoice(layout).data).toMatchObject({
    supplierName: "Example Services AS",
    supplierRegistrationCode: "12345678",
    amountDue: "111.35",
  });
});
it.each(["(100.00) EUR", "12:34 EUR", "100.00) EUR"])(
  "does not turn signed or malformed amount %s into an outgoing payment",
  (amount) => {
    const result = extractLayoutInvoice(lines([["Amount due", amount]]));
    expect(result.data.amountDue).toBeNull();
  },
);
it("does not fall back to an invoice total when the amount due is unreadable", () => {
  const result = extractLayoutInvoice(
    lines([["Total", "124.00 EUR"], ["Amount due"]]),
  );
  expect(result.data.amountDue).toBeNull();
});
it.each(["(EUR):", "EUR:"])("accepts currency label %s without removing amount punctuation", (currency) => {
  const result = extractLayoutInvoice(
    lines([[`Kokku tasuda ${currency}`, "100.00"]]),
  );
  expect(result.data.amountDue).toBe("100.00");
  expect(result.data.currency).toBe("EUR");
});
