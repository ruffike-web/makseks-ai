import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";
import { bankAdapters, validateSebXml } from "../src/lib/banks";
import { defaultSettings, type Payment } from "../src/lib/domain";

const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
const payer = {
  ...defaultSettings(),
  companyName: "Näidisettevõte OÜ",
  iban: "EE121010000000000016",
  bic: "EEUHEE2X",
};
const payment: Payment = {
  id: "a",
  creditorName: "Näidistarnija OÜ",
  creditorIban: "EE382200221020145685",
  amount: "125.40",
  currency: "EUR",
  invoiceNumber: "INV-1001",
  customerNumber: "C-42",
  referenceNumber: "1231247",
  description: "Arve INV-1001, klient C-42",
  executionDate: "2026-10-20",
  creditorTown: "Tallinn",
  creditorCountry: "EE",
};
const p2: Payment = {
  ...payment,
  id: "b",
  creditorName: "Teine Tarnija OÜ",
  creditorIban: "EE121010000000000016",
  amount: "79.90",
  invoiceNumber: "INV-1002",
  customerNumber: null,
  referenceNumber: null,
  description: "Arve INV-1002",
  executionDate: "2026-10-25",
  creditorTown: "Tartu",
};
const options = { now: new Date("2026-10-06T06:30:00Z"), id: "test123" };
describe.each(["SEB", "LHV"] as const)("%s adapter", (bank) => {
  it("matches golden transaction semantics and computes global and date-group totals", async () => {
    const xml = bankAdapters[bank].buildPaymentFile(
      [payment, p2],
      {
        ...payer,
        preferredBank: bank,
        iban: bank === "LHV" ? "EE337700771001260958" : payer.iban,
        bic: bank === "LHV" ? "LHVBEE22" : payer.bic,
      },
      options,
    );
    const actual = parser.parse(xml).Document.CstmrCdtTrfInitn;
    const golden = parser.parse(
      readFileSync(
        `docs/bank-specs/${bank.toLowerCase()}/golden/${bank}_golden_reference_pain001_001_09.xml`,
        "utf8",
      ),
    ).Document.CstmrCdtTrfInitn;
    expect(actual.GrpHdr.CtrlSum).toBe("205.30");
    expect(actual.GrpHdr.NbOfTxs).toBe("2");
    expect(actual.PmtInf).toHaveLength(2);
    for (let i = 0; i < 2; i++) {
      expect(actual.PmtInf[i].ReqdExctnDt).toEqual(
        golden.PmtInf[i].ReqdExctnDt,
      );
      for (const key of ["Amt", "Cdtr"])
        expect(actual.PmtInf[i].CdtTrfTxInf[key]).toEqual(
          golden.PmtInf[i].CdtTrfTxInf[key],
        );
      const expectedRemittance = JSON.parse(
        JSON.stringify(golden.PmtInf[i].CdtTrfTxInf.RmtInf),
      );
      if (i === 0) expectedRemittance.Strd.CdtrRefInf.Ref = "1231247"; // Original GPT reference fails 7-3-1.
      expect(actual.PmtInf[i].CdtTrfTxInf.RmtInf).toEqual(expectedRemittance);
      expect(actual.PmtInf[i].CdtTrfTxInf.CdtrAcct.Id.IBAN).toBe(
        i === 0 ? payment.creditorIban : p2.creditorIban,
      );
      expect(actual.PmtInf[i].PmtTpInf).toEqual(golden.PmtInf[i].PmtTpInf);
    }
    const validation = await bankAdapters[bank].validateGeneratedXml(xml);
    expect(validation.status).toBe("valid");
  });
  it("groups ten same-day payments, creates unique short IDs, and escapes text", () => {
    const xml = bankAdapters[bank].buildPaymentFile(
      Array.from({ length: 10 }, (_, i) => ({
        ...payment,
        id: String(i),
        creditorName: 'Õie & <Poeg> "OÜ"',
        amount: "0.10",
      })),
      {
        ...payer,
        preferredBank: bank,
        iban: bank === "LHV" ? "EE337700771001260958" : payer.iban,
        bic: bank === "LHV" ? "LHVBEE22" : payer.bic,
      },
      options,
    );
    const root = parser.parse(xml).Document.CstmrCdtTrfInitn;
    expect(root.PmtInf.CtrlSum).toBe("1.00");
    expect(root.PmtInf.CdtTrfTxInf).toHaveLength(10);
    expect(root.PmtInf.CdtTrfTxInf[0].Cdtr.Nm).toBe('Õie & <Poeg> "OÜ"');
    const ids = root.PmtInf.CdtTrfTxInf.map(
      (p: { PmtId: { EndToEndId: string } }) => p.PmtId.EndToEndId,
    );
    expect(new Set(ids).size).toBe(10);
    expect(ids.every((id: string) => id.length <= 35)).toBe(true);
    expect(xml).not.toContain("SplmtryData");
  });
  it("rejects invalid amount and IBAN even if called outside the UI", () => {
    expect(() =>
      bankAdapters[bank].buildPaymentFile(
        [{ ...payment, amount: "-1" }],
        payer,
        options,
      ),
    ).toThrow();
    expect(() =>
      bankAdapters[bank].buildPaymentFile(
        [{ ...payment, creditorIban: "bad" }],
        payer,
        options,
      ),
    ).toThrow();
    expect(() =>
      bankAdapters[bank].buildPaymentFile([], payer, options),
    ).toThrow();
  });
});
it("validates original SEB golden against original XSD and rejects broken XML", async () => {
  const xml = readFileSync(
    "docs/bank-specs/seb/golden/SEB_golden_reference_pain001_001_09.xml",
    "utf8",
  );
  expect((await validateSebXml(xml)).status).toBe("valid");
  expect(
    (
      await validateSebXml(
        xml.replace("<PmtMtd>TRF</PmtMtd>", "<PmtMtd>BAD</PmtMtd>"),
      )
    ).status,
  ).toBe("invalid");
});
it("validates the complete LHV schema and rejects schema-invalid or unsafe XML", async () => {
  const xml = readFileSync(
    "docs/bank-specs/lhv/golden/LHV_golden_reference_pain001_001_09.xml",
    "utf8",
  );
  const validate = (value: string) =>
    bankAdapters.LHV.validateGeneratedXml(value);
  expect((await validate(xml)).status).toBe("valid");
  for (const bad of [
    xml.replace("<PmtMtd>TRF</PmtMtd>", "<PmtMtd>BAD</PmtMtd>"),
    xml.replace(/<ReqdExctnDt>[\s\S]*?<\/ReqdExctnDt>/, ""),
    xml.replace("urn:iso:std:iso:20022:tech:xsd:pain.001.001.09", "urn:wrong"),
    '<!DOCTYPE Document [<!ENTITY x SYSTEM "file:///private">]>' + xml,
  ])
    expect((await validate(bad)).status).toBe("invalid");
  const withSupplement = xml.replace(
    "</CstmrCdtTrfInitn>",
    `<SplmtryData><Envlp><ext:Document xmlns:ext="urn:iso:std:iso:20022:tech:xsd:supl.001.001.01"><ext:partyData><ext:party>CREDITOR</ext:party><ext:key>DATE_OF_BIRTH</ext:key><ext:value>1980-09-24</ext:value></ext:partyData></ext:Document></Envlp></SplmtryData></CstmrCdtTrfInitn>`,
  );
  expect((await validate(withSupplement)).status).toBe("valid");
  expect(
    (
      await validate(
        withSupplement.replace(
          "<ext:party>CREDITOR</ext:party>",
          "<ext:party>INVALID</ext:party>",
        ),
      )
    ).status,
  ).toBe("invalid");
});
it("exports the actual short customer description when the noncustomer template would be too long", () => {
  const p = {
    ...payment,
    invoiceNumber: "A".repeat(138),
    customerNumber: "C1",
    description: "Klient C1",
  };
  expect(() =>
    bankAdapters.SEB.buildPaymentFile(
      [p],
      { ...payer, customerDescriptionTemplate: "Klient {customerNumber}" },
      options,
    ),
  ).not.toThrow();
});
