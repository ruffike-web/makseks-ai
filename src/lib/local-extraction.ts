import { isValidIBAN } from "ibantools";
import { blankInvoice, type InvoiceField, type Settings } from "./domain";

export type LocalPayer = Pick<Settings, "companyName" | "registrationCode" | "iban">;
const identity = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("et");

export function localDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const european = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  const result = match ? value : european ? `${european[3]}-${european[2]}-${european[1]}` : null;
  if (!result) return null;
  const parsed = new Date(`${result}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === result ? result : null;
}
export function localAmount(value: string): string | null {
  // Accept explicit cents; reject ambiguous 1,234 / 1.234 rather than guessing.
  let number = value.replace(/EUR|USD|GBP|SEK|NOK|DKK|CHF|PLN|€|£|\$/gi, "").trim();
  if (/^\d{1,3}(?:[ \u00a0]\d{3})+(?:[.,]\d{2})?$/.test(number)) number = number.replace(/[ \u00a0]/g, "");
  else if (/^\d{1,3}(?:,\d{3})+\.\d{2}$/.test(number)) number = number.replaceAll(",", "");
  else if (/^\d{1,3}(?:\.\d{3})+,\d{2}$/.test(number)) number = number.replaceAll(".", "");
  if (!/^\d+(?:[.,]\d{2})?$/.test(number)) return null;
  return number.replace(",", ".") + (/[.,]/.test(number) ? "" : ".00");
}

/** Conservative labels only. No arithmetic, company-name fallback, OCR or network. */
export function extractLocalInvoice(text: string, payer?: LocalPayer) {
  const result = blankInvoice();
  const candidates = new Map<InvoiceField, Set<string>>();
  const invalid = new Set<InvoiceField>();
  function add(field: InvoiceField, value: string | null) {
    if (value === null) invalid.add(field);
    if (!value) return;
    const values = candidates.get(field) ?? new Set<string>();
    values.add(value); candidates.set(field, values);
  }
  let section: "supplier" | "buyer" | "unknown" = "unknown";
  for (const raw of text.slice(0, 100000).split(/\r?\n/)) {
    const line = raw.trim().replace(/\t+/g, " ");
    if (!line) continue;
    const supplier = /^(?:müüja|tarnija|supplier|seller)(?:\s*(?:nimi|name))?\s*(?::\s*|$)(.*)$/i.exec(line);
    if (supplier) {
      section = "supplier";
      if (!payer || identity(supplier[1]) !== identity(payer.companyName)) add("supplierName", supplier[1].trim());
      continue;
    }
    if (/^(?:ostja|maksja|klient|buyer|customer|bill to|payer)(?:\s*(?:nimi|name))?\s*(?::|$)/i.test(line)) { section = "buyer"; continue; }
    if (/^(?:makseandmed|payment details|bank details)\s*:?$/i.test(line)) section = "unknown";
    if (section !== "buyer") {
      const iban = /^(?:saaja\s+)?IBAN\s*:?\s*([A-Z]{2}[\dA-Z ]+)$/i.exec(line);
      if (iban) {
        const value = iban[1].replace(/\s/g, "").toUpperCase();
        if (value !== payer?.iban.replace(/\s/g, "").toUpperCase()) add("supplierIban", isValidIBAN(value) ? value : null);
      }
      const registration = /^(?:(?:müüja|tarnija|supplier|seller)\s+)?(?:registrikood|reg\.?\s*(?:nr|kood)|registration (?:number|code))\s*:?\s*([A-Z0-9-]+)$/i.exec(line);
      if (registration && section === "supplier" && registration[1] !== payer?.registrationCode) add("supplierRegistrationCode", registration[1]);
      const bic = /^(?:BIC|SWIFT)\s*:?\s*([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)$/i.exec(line);
      if (bic) add("supplierBic", bic[1].toUpperCase());
    }
    const rules: [InvoiceField, RegExp][] = [
      ["invoiceNumber", /^(?:arve\s*(?:nr\.?|number)?|invoice\s*(?:no\.?|number|#)?)\s*:?\s+([\w/.-]+)$/i],
      ["referenceNumber", /^(?:viitenumber|viitenr\.?|payment reference|reference number)\s*:?\s*(\d+|RF[\dA-Z ]+)$/i],
      ["customerNumber", /^(?:kliendinumber|kliendi nr\.?|customer (?:number|no\.?))\s*:?\s*([\w/.-]+)$/i],
      ["invoiceDate", /^(?:arve kuupäev|invoice date)\s*:?\s*(\S+)$/i],
      ["dueDate", /^(?:maksetähtpäev|maksetähtaeg|tasumise tähtaeg|due date|payment due)\s*:?\s*(\S+)$/i],
      ["amountDue", /^(?:tasuda|kokku tasuda|kuulub tasumisele|tasumisele kuuluv summa|amount due|balance due|total due)\s*:?\s*(.+)$/i],
      ["currency", /^(?:valuuta|currency)\s*:?\s*([A-Z]{3})$/i],
    ];
    for (const [field, pattern] of rules) {
      const match = pattern.exec(line);
      if (!match) continue;
      const value = match[1].trim();
      // A bare column heading such as "Invoice date" is not an invoice ID.
      if (field === "invoiceNumber" && /^(?:date|no\.?|number|nr\.?|total|due|kuupäev)$/i.test(value)) continue;
      if (field === "amountDue") {
        add(field, localAmount(value));
        for (const currency of value.match(/\b(?:EUR|USD|GBP|SEK|NOK|DKK|CHF|PLN)\b/gi) ?? []) add("currency", currency.toUpperCase());
        if (value.includes("€")) add("currency", "EUR");
      } else if (field === "invoiceDate" || field === "dueDate") add(field, localDate(value));
      else add(field, field === "currency" ? value.toUpperCase() : value);
    }
  }
  for (const [field, values] of candidates) {
    if (values.size === 1 && !invalid.has(field)) {
      result[field] = [...values][0];
      result.confidence[field] = 0.75; // Always show a review warning for local recognition.
    }
  }
  if ((candidates.get("currency")?.size ?? 0) > 1) {
    result.amountDue = null;
    delete result.confidence.amountDue;
  }
  return result;
}
