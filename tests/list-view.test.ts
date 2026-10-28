import { expect, it } from "vitest";
import { blankInvoice } from "../src/lib/domain";
import { invoiceList, listPage, supplierList } from "../src/lib/list-view";
import type { SupplierData } from "../src/lib/suppliers";

const invoices = Array.from({ length: 23 }, (_, index) => ({
  id: String(index), sourceFileName: `invoice-${index}.pdf`,
  data: { ...blankInvoice(), supplierName: `Supplier ${index}`, invoiceNumber: `INV-${index}`, invoiceDate: index === 0 ? null : `2026-10-${String(index).padStart(2, "0")}`, dueDate: index === 0 ? null : `2026-11-${String(24 - index).padStart(2, "0")}`, supplierIban: `EE123${index}` },
}));
it("searches the complete invoice list before pagination and supports multi-word queries", () => {
  expect(listPage(invoices, 1).items).toHaveLength(10);
  expect(listPage(invoices, 2).items).toHaveLength(10);
  expect(listPage(invoices, 3).items).toHaveLength(3);
  expect(invoiceList(invoices, "supplier INV-22", "date-desc", "en").map(i => i.id)).toEqual(["22"]);
  expect(invoiceList(invoices, "EE12321", "date-desc", "en").map(i => i.id)).toEqual(["21"]);
});
it("orders invoice dates and suppliers without mutating data and keeps missing dates last", () => {
  expect(invoiceList(invoices, "", "date-desc", "en")[0].id).toBe("22");
  expect(invoiceList(invoices, "", "date-asc", "en")[0].id).toBe("1");
  expect(invoiceList(invoices, "", "date-asc", "en").at(-1)?.id).toBe("0");
  expect(invoiceList(invoices, "", "due", "en")[0].id).toBe("22");
  expect(invoiceList(invoices, "", "supplier", "en").map(i => i.id).slice(0, 4)).toEqual(["0", "1", "2", "3"]);
  expect(invoices[0].id).toBe("0");
});
it("clamps stale pages after filtering, removing records, or changing company", () => {
  expect(listPage(invoices.slice(0, 11), 3)).toMatchObject({ page: 2, pages: 2, start: 11, end: 11 });
  expect(listPage([], 7)).toMatchObject({ page: 1, pages: 1, start: 0, end: 0, total: 0 });
  expect(listPage(invoices, -1).page).toBe(1);
});
it("sorts suppliers alphabetically in both directions and searches saved accounts or registration", () => {
  const suppliers = ["Õis", "Aare", "Zebra"].map((name, index) => ({ id: String(index), name, registrationCode: `1234567${index}`, trustedIbans: [`EE${index}TEST`], town: "Tallinn" }) as SupplierData);
  expect(supplierList(suppliers, "", false, "et").map(s => s.name)).toEqual(["Aare", "Zebra", "Õis"]);
  expect(supplierList(suppliers, "", true, "et").map(s => s.name)).toEqual(["Õis", "Zebra", "Aare"]);
  expect(supplierList(suppliers, "12345671", false, "et").map(s => s.name)).toEqual(["Aare"]);
  expect(supplierList(suppliers, "ee2test", false, "et").map(s => s.name)).toEqual(["Zebra"]);
});
