import { describe, expect, it } from "vitest";
import { translate, translateMessage } from "../src/lib/i18n";
import { blankInvoice, defaultSettings, evaluateInvoice, fieldLabels, invoiceFields, validatePayer } from "../src/lib/domain";
import { bankProfiles } from "../src/lib/bank-profiles";

describe("interface translations", () => {
  it("keeps Estonian as the default and translates every invoice field", () => {
    expect(translate("et", "Seaded")).toBe("Seaded");
    expect(translate("en", "Seaded")).toBe("Settings");
    for (const field of invoiceFields) expect(translate("en", fieldLabels[field])).not.toBe(fieldLabels[field]);
  });

  it("interpolates user values without translating or recursively interpolating them", () => {
    expect(translate("en", "Unusta tarnija {name}", { name: "Seaded {name} OÜ" })).toBe("Forget supplier Seaded {name} OÜ");
    expect(translate("et", "Unusta tarnija {name}", { name: "Seaded OÜ" })).toBe("Unusta tarnija Seaded OÜ");
    expect(translate("en", " · kindlus {percent}%", { percent: 89 })).toBe(" · confidence 89%");
    expect(translate("en", "{count} arvet lisatud. Kontrolli ja kinnita makseandmed.", { count: 3 })).toBe("3 invoices added. Review and approve the payment details.");
  });

  it("translates actual missing-field and payer validation messages", () => {
    const settings = defaultSettings();
    const issues = [...evaluateInvoice(blankInvoice(), settings, { today: "2026-10-12" }).issues, ...validatePayer(settings)];
    for (const issue of issues) {
      expect(translateMessage("en", issue.message), issue.message).not.toBe(issue.message);
      expect(translateMessage("et", issue.message)).toBe(issue.message);
    }
    const joined = issues.map((issue) => issue.message).join(" ");
    expect(translateMessage("en", joined)).toBe(issues.map((issue) => translateMessage("en", issue.message)).join(" "));
  });

  it("translates dynamic validation and bank import results", () => {
    expect(translateMessage("en", "Saaja linn / asula on liiga pikk (kuni 35 märki).")).toBe("Recipient town / city is too long (maximum 35 characters).");
    expect(translateMessage("en", "Arve kuupäev ei ole kehtiv kuupäev.")).toBe("Invoice date is not a valid date.");
    expect(translateMessage("en", "Kontrolli algdokumendilt: tarnija nimi, saaja IBAN, tasumisele kuuluv summa.")).toBe("Check against the original document: supplier name, recipient iban, amount due.");
    expect(translateMessage("en", "Fail on tühi või ületab 10 MB piiri.")).toBe("The file is empty or exceeds the 10 MB limit.");
    expect(translateMessage("en", "Sisesta Google Gemini API-võti.")).toBe("Enter the Google Gemini API key.");
    for (const bank of Object.values(bankProfiles)) {
      const source = `${bank.displayName} XML läbis panga täieliku XSD kontrolli. ${bank.importNote}`;
      const translated = translateMessage("en", source);
      expect(translated).toContain("XML passed the bank's complete XSD validation.");
      expect(translated).not.toContain(bank.importNote);
    }
  });

  it("leaves unknown messages and data alone", () => {
    for (const source of ["Invoice-123.pdf", "Tarnija AS", "qwen-3.8-27b", "Unknown upstream error 42"]) {
      expect(translateMessage("en", source)).toBe(source);
    }
  });
});
