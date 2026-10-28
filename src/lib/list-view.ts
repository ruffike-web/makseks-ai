import type { InvoiceData } from "./domain";
import type { SupplierData } from "./suppliers";

export type InvoiceOrder = "date-desc" | "date-asc" | "supplier" | "due";
export const PAGE_SIZE = 10;
type InvoiceListItem = { id: string; sourceFileName: string; data: InvoiceData };

function matches(values: (string | null | undefined)[], query: string, locale: string) {
  const haystack = values.filter(Boolean).join(" ").toLocaleLowerCase(locale);
  return query.trim().toLocaleLowerCase(locale).split(/\s+/).every((word) => haystack.includes(word));
}
function compareDate(a: string | null, b: string | null, descending = false) {
  if (!a || !b) return a ? -1 : b ? 1 : 0;
  return descending ? b.localeCompare(a) : a.localeCompare(b);
}
export function invoiceList<T extends InvoiceListItem>(items: T[], query: string, order: InvoiceOrder, locale: string) {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  return items.filter((item) => matches([
    item.data.supplierName, item.data.invoiceNumber, item.sourceFileName,
    item.data.supplierRegistrationCode, item.data.supplierIban,
    item.data.referenceNumber, item.data.invoiceDate, item.data.dueDate,
  ], query, locale)).sort((a, b) => {
    const bySupplier = collator.compare(a.data.supplierName ?? "", b.data.supplierName ?? "");
    const primary = order === "supplier" ? bySupplier : order === "due"
      ? compareDate(a.data.dueDate, b.data.dueDate)
      : compareDate(a.data.invoiceDate, b.data.invoiceDate, order === "date-desc");
    return primary || bySupplier || collator.compare(a.data.invoiceNumber ?? "", b.data.invoiceNumber ?? "") || a.id.localeCompare(b.id);
  });
}
export function supplierList(items: SupplierData[], query: string, descending: boolean, locale: string) {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  return items.filter((item) => matches([
    item.name, item.registrationCode, item.town, ...item.trustedIbans,
  ], query, locale)).sort((a, b) => (descending ? -1 : 1) * collator.compare(a.name, b.name) || a.id.localeCompare(b.id));
}
export function listPage<T>(items: T[], requestedPage: number) {
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.max(1, Math.min(pages, Math.trunc(requestedPage) || 1));
  const offset = (page - 1) * PAGE_SIZE;
  return { items: items.slice(offset, offset + PAGE_SIZE), page, pages, total: items.length, start: items.length ? offset + 1 : 0, end: Math.min(offset + PAGE_SIZE, items.length) };
}
