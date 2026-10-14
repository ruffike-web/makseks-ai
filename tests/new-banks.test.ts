import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";
import { bankProfiles } from "../src/lib/bank-profiles";
import { bankAdapters } from "../src/lib/banks";
import { defaultSettings, type Payment } from "../src/lib/domain";

const parser = new XMLParser({ parseTagValue: false });
const payment: Payment = { id: "1", creditorName: "Tarnija OÜ", creditorIban: "EE121010000000000016", amount: "1.20", currency: "EUR", invoiceNumber: "1", description: "Arve 1", referenceNumber: "1231247", executionDate: "2030-10-20" };
describe.each(["COOP", "SWEDBANK"] as const)("%s official schema", (bank) => {
  const payer = { ...defaultSettings(), preferredBank: bank, companyName: "Test OÜ", iban: bank === "COOP" ? "EE214204200000000000" : "EE382200221020145685", bic: bankProfiles[bank].defaultBic };
  const build = (payments = [payment]) => bankAdapters[bank].buildPaymentFile(payments, payer, { id: "banktest", now: new Date("2030-10-01T12:00:00Z") });
  it("exports multiple dates, sums and domestic reference plus description", async () => {
    const xml = build([payment, { ...payment, id: "2", amount: "2.30", executionDate: "2030-10-21", referenceNumber: null }]);
    const root = parser.parse(xml).Document.CstmrCdtTrfInitn;
    expect(root.GrpHdr.CtrlSum).toBe("3.50");
    expect(root.PmtInf).toHaveLength(2);
    expect(root.PmtInf[0].ReqdExctnDt.Dt).toBe("2030-10-20");
    expect(root.PmtInf[0].DbtrAgt.FinInstnId.BICFI).toBe(payer.bic);
    expect(root.PmtInf[0].PmtTpInf.SvcLvl.Cd).toBe("SEPA");
    expect(root.PmtInf[0].CdtTrfTxInf.RmtInf).toEqual({ Ustrd: "Arve 1", Strd: { CdtrRefInf: { Tp: { CdOrPrtry: { Cd: "SCOR" } }, Ref: "1231247" } } });
    expect(root.PmtInf[1].CdtTrfTxInf.RmtInf).toEqual({ Ustrd: "Arve 1" });
    expect((await bankAdapters[bank].validateGeneratedXml(xml)).status).toBe("valid");
  });
  it("uses only structured remittance for a cross-border reference", async () => {
    const xml = build([{ ...payment, creditorIban: "DE89370400440532013000" }]);
    expect(xml).not.toContain("<Ustrd>");
    expect(xml).not.toContain("<AddtlRmtInf>");
    expect((await bankAdapters[bank].validateGeneratedXml(xml)).status).toBe("valid");
  });
  it("fails closed on invalid XML and unavailable schema", async () => {
    const xml = build();
    for (const bad of [xml.replace("<PmtMtd>TRF</PmtMtd>", "<PmtMtd>BAD</PmtMtd>"), xml.replace(/<ReqdExctnDt>[\s\S]*?<\/ReqdExctnDt>/, ""), xml.replace("pain.001.001.09", "pain.001.001.03"), '<!DOCTYPE Document [<!ENTITY x SYSTEM "file:///private">]>' + xml])
      expect((await bankAdapters[bank].validateGeneratedXml(bad)).status).toBe("invalid");
    const main = bankProfiles[bank].schema.main;
    try {
      bankProfiles[bank].schema.main = "docs/bank-specs/missing.xsd";
      expect((await bankAdapters[bank].validateGeneratedXml(xml)).status).toBe("invalid");
    } finally { bankProfiles[bank].schema.main = main; }
  });
  it("rejects missing address fields and an account from the wrong bank", () => {
    expect(() => build([{ ...payment, creditorAddress: "Tee 1" }])).toThrow();
    expect(() => bankAdapters[bank].buildPaymentFile([payment], { ...payer, iban: "EE121010000000000016" })).toThrow();
  });
});
it("validates original Swedbank domestic and European examples", async () => {
  for (const file of ["Domestic_payment_EE.xml", "European_payment_EE.xml"])
    expect((await bankAdapters.SWEDBANK.validateGeneratedXml(readFileSync(`docs/bank-specs/swedbank/golden/${file}`, "utf8"))).status).toBe("valid");
});
it("Swedbank enforces its name and combined remittance limits", () => {
  const payer = { ...defaultSettings(), companyName: "Test OÜ", iban: "EE382200221020145685", bic: "HABAEE2X" };
  expect(() => bankAdapters.SWEDBANK.buildPaymentFile([{ ...payment, creditorName: "A".repeat(71) }], payer)).toThrow();
  expect(() => bankAdapters.SWEDBANK.buildPaymentFile([{ ...payment, description: "A".repeat(124) }], payer)).toThrow();
});
