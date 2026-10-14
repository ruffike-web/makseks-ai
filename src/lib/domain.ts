import { z } from "zod";
import { isValidIBAN, isSEPACountry } from "ibantools";
import { bankIds, bankProfiles, defaultBank } from "./bank-profiles";
import { aiProviderIds } from "./ai-providers";
export type { Bank } from "./bank-profiles";

const text = z.string().max(2000).nullable();
export const invoiceSchema = z
  .object({
    supplierName: text,
    supplierRegistrationCode: text,
    supplierIban: text,
    supplierBic: text,
    invoiceNumber: text,
    customerNumber: text,
    referenceNumber: text,
    amountDue: text,
    currency: text,
    invoiceDate: text,
    dueDate: text,
    supplierAddress: text,
    supplierStreet: text,
    supplierBuildingNumber: text,
    supplierPostalCode: text,
    supplierTown: text,
    supplierCountryCode: text,
    confidence: z.record(z.string(), z.number().min(0).max(1)),
  })
  .strict();
export type InvoiceData = z.infer<typeof invoiceSchema>;
export type InvoiceField = Exclude<keyof InvoiceData, "confidence">;
export const invoiceFields = Object.keys(invoiceSchema.shape).filter(
  (k) => k !== "confidence",
) as InvoiceField[];
export const fieldLabels: Record<InvoiceField, string> = {
  supplierName: "Tarnija nimi",
  supplierRegistrationCode: "Registrikood",
  supplierIban: "Saaja IBAN",
  supplierBic: "Saaja BIC",
  invoiceNumber: "Arve number",
  customerNumber: "Kliendinumber",
  referenceNumber: "Viitenumber",
  amountDue: "Tasumisele kuuluv summa",
  currency: "Valuuta",
  invoiceDate: "Arve kuupäev",
  dueDate: "Maksetähtpäev",
  supplierAddress: "Aadressirida",
  supplierStreet: "Tänav",
  supplierBuildingNumber: "Maja number",
  supplierPostalCode: "Postiindeks",
  supplierTown: "Saaja linn / asula",
  supplierCountryCode: "Saaja riigikood",
};
export function blankInvoice(): InvoiceData {
  return {
    supplierName: null,
    supplierRegistrationCode: null,
    supplierIban: null,
    supplierBic: null,
    invoiceNumber: null,
    customerNumber: null,
    referenceNumber: null,
    amountDue: null,
    currency: null,
    invoiceDate: null,
    dueDate: null,
    supplierAddress: null,
    supplierStreet: null,
    supplierBuildingNumber: null,
    supplierPostalCode: null,
    supplierTown: null,
    supplierCountryCode: null,
    confidence: {},
  };
}
export const settingsSchema = z
  .object({
    companyName: z.string().max(140),
    registrationCode: z.string().max(35),
    iban: z.string().max(50),
    bic: z.string().max(11),
    address: z.string().max(70),
    postalCode: z.string().max(16),
    town: z.string().max(35),
    countryCode: z.string().max(2),
    defaultCurrency: z.literal("EUR"),
    preferredBank: z.enum(bankIds),
    dateMode: z.enum(["due", "today", "manual"]),
    manualDate: z.string().max(10),
    descriptionTemplate: z.string().min(1).max(200),
    customerDescriptionTemplate: z.string().min(1).max(200),
    aiEnabled: z.boolean(),
    // Legacy installations could only consent to Gemini.
    aiConsentProvider: z.enum(aiProviderIds).default("gemini"),
  })
  .strict();
export type Settings = z.infer<typeof settingsSchema>;
export function defaultSettings(): Settings {
  return {
    companyName: "",
    registrationCode: "",
    iban: "",
    bic: "",
    address: "",
    postalCode: "",
    town: "",
    countryCode: "",
    defaultCurrency: "EUR",
    preferredBank: defaultBank,
    dateMode: "due",
    manualDate: "",
    descriptionTemplate: "Arve {invoiceNumber}",
    customerDescriptionTemplate:
      "Arve {invoiceNumber}, klient {customerNumber}",
    aiEnabled: false,
    aiConsentProvider: "gemini",
  };
}
export type Issue = {
  code: string;
  message: string;
  field?: string;
  severity: "error" | "review" | "warning";
};
export type Status = "READY" | "REVIEW_REQUIRED" | "INVALID" | "EXPORTED";
export const statusLabels: Record<Status, string> = {
  READY: "Valmis",
  EXPORTED: "Eksporditud",
  REVIEW_REQUIRED: "Vajab kontrolli",
  INVALID: "Vigane",
};
export function normalizeIban(value: string) {
  return value.replace(/\s/g, "").toUpperCase();
}
export function validIban(value: string) {
  return isValidIBAN(normalizeIban(value));
}
export function validateReference(value: string): boolean {
  const ref = value.replace(/\s/g, "");
  if (!/^\d{2,20}$/.test(ref)) return false;
  const sum = [...ref.slice(0, -1)]
    .reverse()
    .reduce((s, c, i) => s + Number(c) * [7, 3, 1][i % 3], 0);
  return (10 - (sum % 10)) % 10 === Number(ref.at(-1));
}
export function parseCents(value: string | null | undefined): bigint | null {
  const s = (value ?? "")
    .trim()
    .replace(/[ \u00a0\u202f]/g, "")
    .replace(",", ".");
  if (!/^\d{1,11}(?:\.\d{1,2})?$/.test(s)) return null;
  const [whole, fraction = ""] = s.split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return cents > 0n && cents <= 99999999999n ? cents : null;
}
export function formatCents(cents: bigint): string {
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
}
export function validDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (y < 1900 || y > 9999 || m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}
export function estoniaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Tallinn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (k: string) => parts.find((p) => p.type === k)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function effectiveDate(
  due: string | null,
  s: Settings,
  today = estoniaToday(),
): string | null {
  if (s.dateMode === "today") return today;
  if (s.dateMode === "manual")
    return validDate(s.manualDate) && s.manualDate >= today
      ? s.manualDate
      : null;
  if (!due || !validDate(due)) return null;
  return due < today ? today : due;
}
export function descriptionFor(i: InvoiceData, s: Settings): string {
  return (
    i.customerNumber ? s.customerDescriptionTemplate : s.descriptionTemplate
  )
    .replaceAll("{invoiceNumber}", i.invoiceNumber ?? "")
    .replaceAll("{customerNumber}", i.customerNumber ?? "");
}
export function normalizedName(s: string): string {
  return s.trim().toLocaleLowerCase("et").replace(/\s+/g, " ");
}
export function invoiceIdentity(i: InvoiceData): string | null {
  const cents = parseCents(i.amountDue);
  if (!i.supplierName || !i.invoiceNumber || cents === null) return null;
  return JSON.stringify([
    normalizedName(i.supplierName),
    normalizedName(i.invoiceNumber),
    cents.toString(),
  ]);
}
export function normalizeInvoice(i: InvoiceData): InvoiceData {
  const n = { ...i };
  for (const f of invoiceFields) n[f] = i[f]?.trim() || null;
  if (n.supplierIban) n.supplierIban = normalizeIban(n.supplierIban);
  if (n.supplierBic) n.supplierBic = n.supplierBic.toUpperCase();
  if (n.currency) n.currency = n.currency.toUpperCase();
  if (n.supplierCountryCode)
    n.supplierCountryCode = n.supplierCountryCode.toUpperCase();
  if (n.referenceNumber)
    n.referenceNumber = n.referenceNumber.replace(/\s/g, "");
  const cents = parseCents(n.amountDue);
  if (cents !== null) n.amountDue = formatCents(cents);
  return n;
}
const badXml = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/u; // XML 1.0 forbidden code points.
export function validatePayer(s: Settings): Issue[] {
  const profile = bankProfiles[s.preferredBank];
  const issues: Issue[] = [];
  const add = (field: string, message: string) =>
    issues.push({ code: "PAYER", field, message, severity: "error" });
  if (
    !s.companyName.trim() ||
    s.companyName.length > 140 ||
    badXml.test(s.companyName)
  )
    add("companyName", "Sisesta korrektne maksja ettevõtte nimi.");
  if (!validIban(s.iban)) add("iban", "Maksja IBAN puudub või on vigane.");
  const iban = normalizeIban(s.iban);
  if (
    iban.startsWith("EE") &&
    !profile.estonianBankCodes.includes(iban.slice(4, 6))
  )
    add(
      "iban",
      `Maksja Eesti IBAN ei kuulu valitud ${profile.displayName} pangaprofiilile.`,
    );
  if (s.bic && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(s.bic))
    add("bic", "Maksja BIC on vigane.");
  if (s.bic && !s.bic.startsWith(profile.defaultBic))
    add("bic", "Maksja BIC ei vasta valitud pangale.");
  for (const t of [s.descriptionTemplate, s.customerDescriptionTemplate])
    if (
      /\{(?!invoiceNumber\}|customerNumber\})[^}]*\}/.test(t) ||
      badXml.test(t)
    )
      add(
        "descriptionTemplate",
        "Selgituse mallis on tundmatu kohatäitja või keelatud märk.",
      );
  return issues;
}
export type ReviewContext = {
  today?: string;
  approved?: boolean;
  duplicate?: boolean;
  accountChanged?: boolean;
  supplierConflict?: boolean;
  duplicateAcknowledged?: boolean;
  accountChangeAcknowledged?: boolean;
  exported?: boolean;
};
export function evaluateInvoice(
  raw: InvoiceData,
  s: Settings,
  ctx: ReviewContext = {},
) {
  const i = normalizeInvoice(raw),
    issues: Issue[] = [];
  const add = (
    code: string,
    message: string,
    severity: Issue["severity"] = "review",
    field?: string,
  ) => issues.push({ code, message, severity, field });
  for (const f of [
    "supplierName",
    "supplierIban",
    "amountDue",
    "currency",
    "invoiceNumber",
  ] as const)
    if (!i[f]) add("MISSING", `${fieldLabels[f]} puudub.`, "review", f);
  if (i.supplierIban && !validIban(i.supplierIban))
    add("IBAN", "Saaja IBAN ei läbi kontrolli.", "error", "supplierIban");
  if (
    i.supplierIban &&
    validIban(i.supplierIban) &&
    !isSEPACountry(i.supplierIban.slice(0, 2))
  )
    add(
      "SEPA_COUNTRY",
      "Saaja konto riik jääb selle rakenduse SEPA ulatusest välja.",
      "error",
      "supplierIban",
    );
  if (i.amountDue && parseCents(i.amountDue) === null)
    add(
      "AMOUNT",
      "Summa peab olema positiivne, kuni kahe komakohaga ja kuni 999 999 999,99 EUR.",
      "error",
      "amountDue",
    );
  if (i.currency && i.currency !== "EUR")
    add("CURRENCY", "Toetatud on ainult EUR-maksed.", "error", "currency");
  if (i.referenceNumber && !validateReference(i.referenceNumber))
    add(
      "REFERENCE",
      "Viitenumber ei läbi 7-3-1 kontrolli (2–20 numbrit). Paranda või eemalda see teadlikult.",
      "error",
      "referenceNumber",
    );
  if (
    i.supplierBic &&
    !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(i.supplierBic)
  )
    add("BIC", "Saaja BIC on vigane.", "error", "supplierBic");
  for (const f of ["invoiceDate", "dueDate"] as const)
    if (i[f] && !validDate(i[f]))
      add("DATE", `${fieldLabels[f]} ei ole kehtiv kuupäev.`, "error", f);
  const executionDate = effectiveDate(i.dueDate, s, ctx.today);
  if (!executionDate)
    add(
      "EXECUTION_DATE",
      "Makse kuupäev puudub või on minevikus. Kontrolli maksetähtpäeva ja kuupäeva seadeid.",
    );
  const lengths: Partial<Record<InvoiceField, number>> = {
    supplierName: bankProfiles[s.preferredBank].maxCreditorNameLength ?? 140,
    supplierAddress: 70,
    supplierStreet: 70,
    supplierBuildingNumber: 16,
    supplierPostalCode: 16,
    supplierTown: 35,
    supplierCountryCode: 2,
  };
  for (const f of invoiceFields) {
    if (i[f] && badXml.test(i[f]!))
      add(
        "XML_CHAR",
        `${fieldLabels[f]} sisaldab XML-is keelatud märki.`,
        "error",
        f,
      );
    if (i[f] && lengths[f] && i[f]!.length > lengths[f]!)
      add(
        "LENGTH",
        `${fieldLabels[f]} on liiga pikk (kuni ${lengths[f]} märki).`,
        "error",
        f,
      );
  }
  if (i.supplierCountryCode && !/^[A-Z]{2}$/.test(i.supplierCountryCode))
    add(
      "COUNTRY",
      "Riigikood peab sisaldama kahte suurtähte.",
      "error",
      "supplierCountryCode",
    );
  const hasAddress = [
    i.supplierAddress,
    i.supplierStreet,
    i.supplierBuildingNumber,
    i.supplierPostalCode,
    i.supplierTown,
    i.supplierCountryCode,
  ].some(Boolean);
  if (
    hasAddress &&
    bankProfiles[s.preferredBank].requireTownAndCountryWithAddress
  ) {
    if (!i.supplierTown)
      add(
        "ADDRESS",
        `${bankProfiles[s.preferredBank].displayName} makse saaja aadressis puudub linn / asula. Täida arve lisaandmetes saaja linn / asula ja salvesta muudatused.`,
        "review",
        "supplierTown",
      );
    if (!i.supplierCountryCode)
      add(
        "ADDRESS",
        `${bankProfiles[s.preferredBank].displayName} makse saaja aadressis puudub riigikood. Täida arve lisaandmetes saaja riigikood (Eesti puhul EE) ja salvesta muudatused.`,
        "review",
        "supplierCountryCode",
      );
  }
  const description = descriptionFor(i, s);
  const remittanceLimit =
    bankProfiles[s.preferredBank].xml.domesticRemittanceMaxLength;
  if (
    remittanceLimit &&
    i.referenceNumber &&
    normalizeIban(i.supplierIban ?? "").startsWith("EE") &&
    description.length + i.referenceNumber.replace(/\s/g, "").length >
      remittanceLimit
  )
    add(
      "DESCRIPTION",
      `Selgitus ja viitenumber võivad kokku olla kuni ${remittanceLimit} märki.`,
      "error",
    );
  if (description.length > 140 || badXml.test(description))
    add(
      "DESCRIPTION",
      "Makse selgitus on liiga pikk (kuni 140 märki) või sisaldab keelatud märki.",
      "error",
    );
  if ((ctx.duplicate || ctx.exported) && !ctx.duplicateAcknowledged)
    add(
      "DUPLICATE",
      ctx.exported
        ? "See arve on juba maksefaili lisatud. Kinnita korduv eksport eraldi."
        : "Võimalik duplikaatarve. Kontrolli, et makset ei tehta kaks korda.",
    );
  if (ctx.accountChanged && !ctx.accountChangeAcknowledged)
    add(
      "ACCOUNT_CHANGED",
      "Saaja konto erineb selle tarnija varem kinnitatud kontost.",
    );
  if (ctx.supplierConflict)
    add("SUPPLIER_CONFLICT", "Tarnija nimi ja IBAN viitavad eri salvestatud tarnijatele. Kontrolli algdokumenti ning paranda nimi või konto.", "error");
  if (!ctx.approved) {
    add("APPROVAL", "Kontrolli makseandmeid ja kinnita arve enne eksporti.");
    const uncertain = (
      [
        "supplierName",
        "supplierIban",
        "amountDue",
        "currency",
        "dueDate",
      ] as const
    ).filter((f) => i[f] && (i.confidence[f] ?? 0) < 0.85);
    if (uncertain.length)
      add(
        "CONFIDENCE",
        `Kontrolli algdokumendilt: ${uncertain.map((f) => fieldLabels[f].toLowerCase()).join(", ")}.`,
        "warning",
      );
  }
  const status: Status = issues.some((x) => x.severity === "error")
    ? "INVALID"
    : issues.some((x) => x.severity === "review")
      ? "REVIEW_REQUIRED"
      : "READY";
  return { status, issues, executionDate, description };
}
export type Payment = {
  id: string;
  creditorName: string;
  creditorIban: string;
  creditorBic?: string | null;
  creditorAddress?: string | null;
  creditorStreet?: string | null;
  creditorBuildingNumber?: string | null;
  creditorPostalCode?: string | null;
  creditorTown?: string | null;
  creditorCountry?: string | null;
  amount: string;
  currency: "EUR";
  invoiceNumber: string;
  customerNumber?: string | null;
  referenceNumber?: string | null;
  description: string;
  executionDate: string;
};
export function toPayment(
  id: string,
  i: InvoiceData,
  s: Settings,
  ctx: ReviewContext,
): Payment {
  const n = normalizeInvoice(i),
    result = evaluateInvoice(n, s, ctx);
  if (result.status !== "READY")
    throw new Error("Arve ei ole ekspordiks kinnitatud või sisaldab vigu.");
  return {
    id,
    creditorName: n.supplierName!,
    creditorIban: n.supplierIban!,
    creditorBic: n.supplierBic,
    creditorAddress: n.supplierAddress,
    creditorStreet: n.supplierStreet,
    creditorBuildingNumber: n.supplierBuildingNumber,
    creditorPostalCode: n.supplierPostalCode,
    creditorTown: n.supplierTown,
    creditorCountry: n.supplierCountryCode,
    amount: formatCents(parseCents(n.amountDue)!),
    currency: "EUR",
    invoiceNumber: n.invoiceNumber!,
    customerNumber: n.customerNumber,
    referenceNumber: n.referenceNumber,
    description: result.description,
    executionDate: result.executionDate!,
  };
}
export function groupPaymentsForExport<T extends { executionDate: string }>(
  payments: T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const p of [...payments].sort((a, b) =>
    a.executionDate.localeCompare(b.executionDate),
  )) {
    const group = groups.get(p.executionDate) ?? [];
    group.push(p);
    groups.set(p.executionDate, group);
  }
  return groups;
}
