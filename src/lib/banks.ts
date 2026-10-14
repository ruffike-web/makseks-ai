import { create } from "xmlbuilder2";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { bankIds, bankProfiles } from "./bank-profiles";
import {
  blankInvoice,
  evaluateInvoice,
  formatCents,
  groupPaymentsForExport,
  normalizeIban,
  parseCents,
  validatePayer,
  type Bank,
  type Payment,
  type Settings,
} from "./domain";

export const PAIN_NS = "urn:iso:std:iso:20022:tech:xsd:pain.001.001.09";
export type XmlValidation = {
  status: "valid" | "invalid";
  message: string;
};
export type ExportOptions = { now?: Date; id?: string };
export interface BankAdapter {
  id: Bank;
  displayName: string;
  buildPaymentFile(
    payments: Payment[],
    payer: Settings,
    options?: ExportOptions,
  ): string;
  validateGeneratedXml(xml: string): Promise<XmlValidation>;
}
async function validateBankXml(
  bank: Bank,
  xml: string,
): Promise<XmlValidation> {
  const profile = bankProfiles[bank];
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    return {
      status: "invalid",
      message: "XML-i välised olemid ei ole lubatud.",
    };
  const {
    XmlDocument,
    XsdValidator,
    XmlBufferInputProvider,
    xmlRegisterInputProvider,
    xmlCleanupInputProvider,
  } = await import("libxml2-wasm");
  let schema: InstanceType<typeof XmlDocument> | undefined;
  let validator: InstanceType<typeof XsdValidator> | undefined;
  let doc: InstanceType<typeof XmlDocument> | undefined;
  let registered = false;
  try {
    const [main, imports] = await Promise.all([
      readFile(/* turbopackIgnore: true */ profile.schema.main, "utf8"),
      Promise.all(
        Object.entries(profile.schema.imports).map(
          async ([name, file]) =>
            [name, await readFile(/* turbopackIgnore: true */ file)] as const,
        ),
      ),
    ]);
    // All asynchronous reads finish before registering the process-global provider.
    // Compile, validate and clean up synchronously; only the bundled import is exposed.
    if (imports.length) {
      registered = xmlRegisterInputProvider(
        new XmlBufferInputProvider(Object.fromEntries(imports)),
      );
      if (!registered) throw new Error("Schema provider registration failed");
    }
    schema = XmlDocument.fromString(main);
    validator = XsdValidator.fromDoc(schema);
    doc = XmlDocument.fromString(xml);
    validator.validate(doc);
    return {
      status: "valid",
      message: `${profile.displayName} XML läbis panga täieliku XSD kontrolli. ${profile.importNote}`,
    };
  } catch {
    return {
      status: "invalid",
      message: `${profile.displayName} XML ei läbinud panga XSD kontrolli. Kontrolli makseandmeid ja skeemifailide olemasolu.`,
    };
  } finally {
    doc?.dispose();
    validator?.dispose();
    schema?.dispose();
    if (registered) xmlCleanupInputProvider();
  }
}
export function validateSebXml(xml: string): Promise<XmlValidation> {
  return validateBankXml("SEB", xml);
}

type XmlNode = ReturnType<typeof create>;
function child(parent: XmlNode, name: string, value: string) {
  parent.ele(name).txt(value);
}
function address(parent: XmlNode, p: Payment) {
  const entries = [
    ["StrtNm", p.creditorStreet],
    ["BldgNb", p.creditorBuildingNumber],
    ["PstCd", p.creditorPostalCode],
    ["TwnNm", p.creditorTown],
    ["Ctry", p.creditorCountry],
    ["AdrLine", p.creditorAddress],
  ];
  if (!entries.some(([, v]) => v)) return;
  const adr = parent.ele("PstlAdr");
  for (const [k, v] of entries) if (v) child(adr, k!, v);
}
function build(
  bank: Bank,
  payments: Payment[],
  payer: Settings,
  options: ExportOptions = {},
): string {
  const profile = bankProfiles[bank];
  if (payments.length === 0 || payments.length > 500)
    throw new Error("Vali 1–500 kinnitatud makset.");
  const s = { ...payer, preferredBank: bank };
  const payerIssues = validatePayer(s);
  if (payerIssues.length)
    throw new Error(payerIssues.map((i) => i.message).join(" "));
  for (const p of payments) {
    const data = {
      ...blankInvoice(),
      supplierName: p.creditorName,
      supplierIban: p.creditorIban,
      supplierBic: p.creditorBic ?? null,
      supplierAddress: p.creditorAddress ?? null,
      supplierStreet: p.creditorStreet ?? null,
      supplierBuildingNumber: p.creditorBuildingNumber ?? null,
      supplierPostalCode: p.creditorPostalCode ?? null,
      supplierTown: p.creditorTown ?? null,
      supplierCountryCode: p.creditorCountry ?? null,
      amountDue: p.amount,
      currency: p.currency,
      invoiceNumber: p.invoiceNumber,
      customerNumber: p.customerNumber ?? null,
      referenceNumber: p.referenceNumber ?? null,
      dueDate: p.executionDate,
    };
    const checked = evaluateInvoice(
      data,
      { ...s, dateMode: "due" },
      { today: p.executionDate, approved: true },
    );
    const remittanceLimit = profile.xml.domesticRemittanceMaxLength;
    if (remittanceLimit && p.referenceNumber && normalizeIban(p.creditorIban).startsWith("EE") &&
        p.description.length + p.referenceNumber.replace(/\s/g, "").length > remittanceLimit)
      throw new Error(`${profile.displayName}: selgitus ja viitenumber võivad kokku olla kuni ${remittanceLimit} märki.`);
    if (
      checked.status !== "READY" ||
      !p.description ||
      p.description.length > 140
    )
      throw new Error("Makse sisaldab vigaseid või puuduvaid andmeid.");
  }
  const id = (options.id ?? randomUUID().replaceAll("-", "")).slice(0, 20);
  if (!/^[a-zA-Z0-9]+$/.test(id))
    throw new Error("Vigane tehniline identifikaator.");
  const document = create({ version: "1.0", encoding: "UTF-8" }).ele(
    "Document",
    { xmlns: profile.xml.namespace },
  );
  const root = document.ele("CstmrCdtTrfInitn"),
    header = root.ele("GrpHdr");
  child(header, "MsgId", `M-${id}`);
  child(header, "CreDtTm", (options.now ?? new Date()).toISOString());
  child(header, "NbOfTxs", String(payments.length));
  const total = (ps: Payment[]) =>
    formatCents(ps.reduce((a, p) => a + parseCents(p.amount)!, 0n));
  child(header, "CtrlSum", total(payments));
  child(header.ele("InitgPty"), "Nm", s.companyName);
  let groupIndex = 0,
    txIndex = 0;
  for (const [date, group] of groupPaymentsForExport(payments)) {
    const info = root.ele("PmtInf");
    child(info, "PmtInfId", `P-${id}-${++groupIndex}`);
    child(info, "PmtMtd", "TRF");
    if (profile.xml.batchBooking !== null)
      child(info, "BtchBookg", String(profile.xml.batchBooking));
    child(info, "NbOfTxs", String(group.length));
    child(info, "CtrlSum", total(group));
    child(
      info.ele("PmtTpInf").ele("SvcLvl"),
      profile.xml.serviceLevelElement,
      "SEPA",
    );
    child(info.ele("ReqdExctnDt"), "Dt", date);
    child(info.ele("Dbtr"), "Nm", s.companyName);
    child(info.ele("DbtrAcct").ele("Id"), "IBAN", normalizeIban(s.iban));
    child(
      info.ele("DbtrAgt").ele("FinInstnId"),
      "BICFI",
      s.bic || profile.defaultBic,
    );
    if (profile.xml.paymentChargeBearer)
      child(info, "ChrgBr", profile.xml.paymentChargeBearer);
    for (const p of group) {
      const tx = info.ele("CdtTrfTxInf"),
        ids = tx.ele("PmtId");
      const suffix = ++txIndex;
      if (profile.xml.includeInstructionId)
        child(ids, "InstrId", `I-${id}-${suffix}`);
      child(ids, "EndToEndId", `E-${id}-${suffix}`);
      tx.ele("Amt")
        .ele("InstdAmt", { Ccy: "EUR" })
        .txt(formatCents(parseCents(p.amount)!));
      if (profile.xml.transactionChargeBearer)
        child(tx, "ChrgBr", profile.xml.transactionChargeBearer);
      if (p.creditorBic)
        child(tx.ele("CdtrAgt").ele("FinInstnId"), "BICFI", p.creditorBic);
      const creditor = tx.ele("Cdtr");
      child(creditor, "Nm", p.creditorName);
      address(creditor, p);
      child(
        tx.ele("CdtrAcct").ele("Id"),
        "IBAN",
        normalizeIban(p.creditorIban),
      );
      const remittance = tx.ele("RmtInf");
      if (p.referenceNumber) {
        if (profile.xml.referenceDescription === "domestic-unstructured" && normalizeIban(p.creditorIban).startsWith("EE"))
          child(remittance, "Ustrd", p.description);
        const strd = remittance.ele("Strd"),
          ref = strd.ele("CdtrRefInf");
        const referenceType = ref.ele("Tp");
        child(referenceType.ele("CdOrPrtry"), "Cd", "SCOR");
        child(ref, "Ref", p.referenceNumber.replace(/\s/g, ""));
        if (profile.xml.referenceDescription !== "domestic-unstructured")
          child(strd, "AddtlRmtInf", p.description);
      } else child(remittance, "Ustrd", p.description);
    }
  }
  return document.end({ prettyPrint: true });
}
export class Pain001BankAdapter implements BankAdapter {
  constructor(public readonly id: Bank) {}
  get displayName() {
    return bankProfiles[this.id].displayName;
  }
  buildPaymentFile(p: Payment[], s: Settings, o?: ExportOptions) {
    return build(this.id, p, s, o);
  }
  validateGeneratedXml(xml: string) {
    return validateBankXml(this.id, xml);
  }
}
export const bankAdapters = Object.fromEntries(
  bankIds.map((id) => [id, new Pain001BankAdapter(id)]),
) as Record<Bank, BankAdapter>;
