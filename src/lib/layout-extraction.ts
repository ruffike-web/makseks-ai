import { isValidIBAN, isValidBIC } from "ibantools";
import { blankInvoice, type InvoiceField } from "./domain";
import { localAmount, localDate, type LocalPayer } from "./local-extraction";
import type { PdfCell, PdfLine } from "./pdf-layout";

type Located = PdfCell & { page: number; row: number; col: number };
const supplierLabel =
  /^(?:tarnija|müüja|supplier|seller|hankija(?: ja kauba saatja)?)(?:\s+(?:nimi|name))?\s*:?\s*/i;
const buyerLabel =
  /^(?:maksja|ostja|klient|buyer|customer|bill to|payer|kauba saaja)(?:\s+(?:nimi|name))?\s*:?\s*/i;
const registration =
  /(?:^|[;,]\s*)(?:reg\.?\s*(?:nr|number|kood)\.?|registrikood|registration (?:number|code))\s*[:.]?\s*/i;
const companyKey = (name: string) =>
  name
    .toUpperCase()
    .replace(/\b(?:AS|AB|OÜ|OU|LTD|OY)\b/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
const currencyPattern = /\b(?:EUR|USD|GBP|SEK|NOK|DKK|CHF|PLN)\b|€/gi;
const rules: [InvoiceField, RegExp][] = [
  [
    "invoiceNumber",
    /^(?:koondarve|arve-saateleht|arve\s*(?:nr\.?|number)?|invoice\s*(?:no\.?|number|#)?)\s*[:.]?\s*/i,
  ],
  ["invoiceDate", /^(?:arve kuupäev|invoice date|kuupäev)\s*:?\s*/i],
  [
    "dueDate",
    /^(?:maksetähtpäev|maksetähtaeg|maksekuupäev|tasumise tähtaeg|tähtaeg|due date|payment due)\s*:?\s*/i,
  ],
  [
    "referenceNumber",
    /^(?:viitenumber|viitenr\.?|payment reference|reference number)\s*:?\s*/i,
  ],
  [
    "customerNumber",
    /^(?:kliendinumber|kliendi\s*(?:number|nr\s*\.?)|customer (?:number|no\.?))\s*:?\s*/i,
  ],
  [
    "amountDue",
    /^(?:kokku tasuda|tasumisele kuulub(?: koos käesoleva arvega)?|kuulub tasumisele|tasumisele kuuluv summa|tasuda|amount due|balance due|total due)\s*:?\s*/i,
  ],
];
const totalLabel =
  /^(?:arve kokku|kogusumma|kokku|invoice total|grand total|total)\s*(?:\(?EUR\)?)?\s*:?\s*$/i;

/** Layout-based rules; document values remain untrusted until the user approves them. */
export function extractLayoutInvoice(input: PdfLine[], payer?: LocalPayer) {
  const lines = input.map((line) => ({
    ...line,
    cells: line.cells.filter(
      (cell) => !cell.text.startsWith("DFC_") && cell.height >= 3,
    ),
  }));
  const cells: Located[] = lines.flatMap((line, row) =>
    line.cells.map((cell, col) => ({
      ...cell,
      y: line.y,
      row,
      col,
      page: line.page,
    })),
  );
  const data = blankInvoice();
  const values = new Map<InvoiceField, Set<string>>();
  const invalid = new Set<InvoiceField>();
  const add = (field: InvoiceField, value: string | null) => {
    if (value === null) {
      invalid.add(field);
      return;
    }
    if (!value) return;
    const set = values.get(field) ?? new Set<string>();
    set.add(value);
    values.set(field, set);
  };
  const isPayer = (cell: Located) =>
    Boolean(
      payer?.companyName &&
      companyKey(cell.text) === companyKey(payer.companyName),
    );
  const roles = cells.filter(
    (c) => supplierLabel.test(c.text) || buyerLabel.test(c.text) || isPayer(c),
  );
  const buyerCell = (cell: Located) => {
    const near = roles
      .filter(
        (r) =>
          r.page === cell.page &&
          r.y <= cell.y &&
          cell.y - r.y < 150 &&
          Math.abs(r.x - cell.x) < 100,
      )
      .sort((a, b) => b.y - a.y)[0];
    return Boolean(near && (buyerLabel.test(near.text) || isPayer(near)));
  };
  const labelled = (text: string) =>
    rules.some(([, rule]) => rule.test(text)) ||
    registration.test(text) ||
    /^(?:KMKR|periood|viivis|saldo)\b/i.test(text);
  function following(cell: Located, inline: string, below = true) {
    if (
      inline.trim() &&
      !/^[\s():]*(?:EUR|USD|GBP|SEK|NOK|DKK|CHF|PLN|€)?[\s():]*$/i.test(inline)
    )
      return inline.trim();
    const right = lines[cell.row].cells.slice(cell.col + 1);
    const parts: string[] = inline.trim() ? [inline.trim()] : [];
    for (const next of right) {
      if (labelled(next.text)) break;
      parts.push(next.text);
    }
    if (parts.length) return parts.join(" ").trim();
    if (below) {
      const next = cells.find(
        (c) =>
          c.page === cell.page &&
          c.row > cell.row &&
          c.y - cell.y <= Math.max(18, cell.height * 2) &&
          Math.abs(c.x - cell.x) < 18,
      );
      if (next && !labelled(next.text)) return next.text.trim();
    }
    return "";
  }
  // Explicit supplier labels, or a legal company name backed by a nearby registry label.
  const companies: { cell: Located; name: string; score: number }[] = [];
  for (const cell of cells) {
    const explicit = supplierLabel.exec(cell.text);
    let name = explicit
      ? following(cell, cell.text.slice(explicit[0].length))
      : cell.text.split(",")[0].trim();
    name = name
      .split(/\s+(?:arve\s*(?:nr|number)|invoice\s*(?:no|number))\s*[:.]/i)[0]
      .trim();
    const legal =
      /^(?:AS|OÜ|OU)\s+\S.+|\S.+\s(?:OÜ|OU|AS|AB|Ltd\.?|Oy|ÜHISTU)$/i.test(
        name,
      );
    if (
      (!explicit && !legal) ||
      !name ||
      name.length > 140 ||
      buyerCell(cell) ||
      (payer?.companyName && companyKey(name) === companyKey(payer.companyName))
    )
      continue;
    const nearReg = cells.some(
      (r) =>
        r.page === cell.page &&
        r.y >= cell.y &&
        r.y - cell.y < 65 &&
        registration.test(r.text) &&
        (Math.abs(r.x - cell.x) < 85 || Math.abs(r.y - cell.y) < 3),
    );
    const supplierAbove = roles.some(
      (r) =>
        supplierLabel.test(r.text) &&
        r.page === cell.page &&
        r.y <= cell.y &&
        cell.y - r.y < 45 &&
        Math.abs(r.x - cell.x) < 30,
    );
    const score =
      (explicit ? 100 : 0) + (supplierAbove ? 60 : 0) + (nearReg ? 40 : 0);
    if (score) companies.push({ cell, name, score });
  }
  companies.sort((a, b) => b.score - a.score);
  const best = companies[0];
  const selected =
    best &&
    !companies.some(
      (c) =>
        c.score === best.score && companyKey(c.name) !== companyKey(best.name),
    )
      ? best
      : undefined;
  if (selected) {
    add("supplierName", selected.name);
    const regs = cells
      .filter(
        (r) =>
          r.page === selected.cell.page &&
          r.y >= selected.cell.y &&
          r.y - selected.cell.y < 70 &&
          registration.test(r.text) &&
          !buyerCell(r),
      )
      .sort(
        (a, b) =>
          (a.y - selected.cell.y) * 4 +
          Math.abs(a.x - selected.cell.x) * 0.2 -
          ((b.y - selected.cell.y) * 4 + Math.abs(b.x - selected.cell.x) * 0.2),
      );
    if (regs[0]) {
      const match = registration.exec(regs[0].text)!;
      const code = /^([A-Z0-9-]{5,20})(?:[\s;,]|$)/.exec(
        following(regs[0], regs[0].text.slice(match.index + match[0].length)),
      );
      if (code && code[1] !== payer?.registrationCode)
        add("supplierRegistrationCode", code[1]);
    }
  }
  const accounts = new Set<string>();
  for (const cell of cells) {
    if (buyerCell(cell)) continue;
    for (const match of cell.text.matchAll(
      /\b[A-Z]{2}\s*\d{2}(?:\s*[A-Z0-9]){10,32}/g,
    )) {
      const compact = match[0].replace(/\s/g, "");
      for (let length = 15; length <= Math.min(34, compact.length); length++) {
        const iban = compact.slice(0, length);
        if (
          isValidIBAN(iban) &&
          iban !== payer?.iban.replace(/\s/g, "").toUpperCase()
        )
          accounts.add(iban);
      }
    }
  }
  if (accounts.size === 1) add("supplierIban", [...accounts][0]);
  if (accounts.size === 1) for (const cell of cells) {
    if (buyerCell(cell)) continue;
    const label = /^(?:SWIFT|BIC)\s*:?\s*/i.exec(cell.text);
    if (!label) continue;
    const value = following(cell, cell.text.slice(label[0].length));
    if (isValidBIC(value)) add("supplierBic", value);
  }
  const dueAmounts: string[] = [],
    totals: string[] = [],
    explicitCurrencies = new Set<string>();
  const currencies = new Set<string>();
  let dueSeen = false,
    hasAdjustments = false;
  for (const cell of cells) {
    for (const code of cell.text.match(currencyPattern) ?? [])
      currencies.add(code === "€" ? "EUR" : code.toUpperCase());
    if (
      /\b(?:tasutud|paid|ettemaks|prepayment|võlg|võlgnevus|saldo|balance brought)\b/i.test(
        cell.text,
      )
    )
      hasAdjustments = true;
    if (totalLabel.test(cell.text)) {
      const candidate = localAmount(following(cell, "", false));
      if (candidate) totals.push(candidate);
    }
    for (const [field, rule] of rules) {
      const match = rule.exec(cell.text);
      if (!match) continue;
      // General invoice prefix must not eat more specific labels or totals.
      if (
        field === "invoiceNumber" &&
        /^(?:arve kuupäev|arve kokku|invoice date|invoice total)/i.test(
          cell.text,
        )
      )
        continue;
      const value = following(cell, cell.text.slice(match[0].length));
      if (!value && field !== "amountDue") continue;
      if (field === "amountDue") {
        dueSeen = true;
        // Only currency-label decoration is removable; parentheses around an
        // amount may mean a credit, and numeric punctuation must not be repaired.
        const amount = localAmount(
          value.replace(/\((EUR|USD|GBP|SEK|NOK|DKK|CHF|PLN|€)\)\s*:?/gi, "$1 ")
            .replace(/^\s*(EUR|USD|GBP|SEK|NOK|DKK|CHF|PLN|€)\s*:\s*/i, "$1 "),
        );
        if (amount) dueAmounts.push(amount);
        else invalid.add(field);
        for (const code of (cell.text + " " + value).match(currencyPattern) ??
          [])
          explicitCurrencies.add(code === "€" ? "EUR" : code.toUpperCase());
      } else if (field === "invoiceDate" || field === "dueDate") {
        const token = /^(\d{4}-\d{2}-\d{2}|\d{2}\.\d{2}\.\d{4})(?:\s|$)/.exec(
          value,
        );
        if (token) add(field, localDate(token[1]));
      } else {
        const token =
          field === "referenceNumber"
            ? /^(RF[\dA-Z]+|\d+)(?:[\s,;]|$)/i.exec(value)
            : /^([\p{L}\p{N}][\p{L}\p{N}./-]*)(?:[\s,;]|$)/u.exec(value);
        if (
          field === "invoiceNumber" &&
          /^(?:arve|invoice)\s*[:.]?\s*$/i.test(match[0]) &&
          !/\d/.test(token?.[1] ?? "")
        )
          continue;
        if (
          token &&
          !/^(?:nr\.?|no\.?|number|date|kuupäev|kokku|total)$/i.test(token[1])
        )
          add(field, token[1]);
        if (field === "invoiceNumber" && token) {
          const dates = lines[cell.row].cells
            .map((c) => localDate(c.text))
            .filter((d): d is string => Boolean(d));
          if (dates.length === 1) add("invoiceDate", dates[0]);
        }
      }
    }
  }
  for (const value of dueSeen ? dueAmounts : hasAdjustments ? [] : totals)
    add("amountDue", value);
  for (const code of explicitCurrencies.size ? explicitCurrencies : currencies)
    add("currency", code);
  for (const [field, set] of values)
    if (set.size === 1 && !invalid.has(field)) {
      data[field] = [...set][0];
      data.confidence[field] = 0.75;
    }
  if ((values.get("currency")?.size ?? 0) > 1) {
    data.amountDue = null;
    delete data.confidence.amountDue;
  }
  return { data, accountCandidates: [...accounts] };
}
