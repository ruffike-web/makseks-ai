/** Only explicit calendar-day terms are accepted; receipt/delivery and working-day rules need review. */
export const paymentTermsLabel = /^(?:maksetäht(?:aeg|päev)|tasumise tähtaeg|maksetingimus(?:ed)?|tasumistingimus(?:ed)?|tasumise tingimus(?:ed)?|payment terms?|terms|payment due|due in)(?:\s*\(?(?:päevades|days)\)?)?(?=\s|:|$)\s*:?\s*/i;

export const paymentDateValue = /^\d{1,4}[./-]\d{1,2}[./-]\d{1,4}(?:\s|$)/;

export function paymentTermCount(value: string | null | undefined): number | null {
  if (!value || !/^\d+$/.test(value.trim())) return null;
  const count = Number(value.trim());
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export function parsePaymentTermValue(value: string, label = ""): string | null {
  const clean = value.trim().replace(/\.$/, "").replace(
    /\s+(?:(?:alates\s+)?arve\s+kuupäevast|(?:from|after)\s+(?:the\s+)?invoice\s+date)$/i,
    "",
  );
  const match = /^(?:net\s*(\d+)(?:\s+(?:calendar\s+)?days?)?|(\d+)\s*(?:kalendripäeva|päeva(?:\s+jooksul)?|(?:calendar\s+)?days?))$/i.exec(clean);
  const valueInDays = match?.[1] ?? match?.[2] ?? (/\b(?:päevades|days)\b/i.test(label) ? clean : null);
  const count = paymentTermCount(valueInDays);
  return count === null ? null : String(count);
}
