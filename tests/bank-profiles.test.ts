import { expect, it } from "vitest";
import { bankProfiles, bankIds, bankOptions } from "../src/lib/bank-profiles";
import { bankAdapters } from "../src/lib/banks";
import {
  defaultSettings,
  settingsSchema,
  validatePayer,
  evaluateInvoice,
  blankInvoice,
} from "../src/lib/domain";
import { existsSync } from "node:fs";

it("every enabled bank has settings, an adapter and complete local schemas", () => {
  expect(Object.keys(bankAdapters)).toEqual(bankIds);
  expect(bankOptions.map((b) => b.id)).toEqual(bankIds);
  for (const id of bankIds) {
    expect(
      settingsSchema.parse({ ...defaultSettings(), preferredBank: id })
        .preferredBank,
    ).toBe(id);
    const profile = bankProfiles[id];
    expect(bankAdapters[id].displayName).toBe(profile.displayName);
    for (const path of [
      profile.schema.main,
      ...Object.values(profile.schema.imports),
    ])
      expect(existsSync(path)).toBe(true);
  }
  expect(
    settingsSchema.safeParse({
      ...defaultSettings(),
      preferredBank: "UNREGISTERED",
    }).success,
  ).toBe(false);
});

it("payer bank and creditor address rules follow the selected profile", () => {
  const accounts = { SEB: "EE121010000000000016", LHV: "EE337700771001260958", COOP: "EE214204200000000000", SWEDBANK: "EE382200221020145685" };
  for (const id of bankIds) {
    const settings = {
      ...defaultSettings(),
      preferredBank: id,
      companyName: "Test OÜ",
      iban: accounts[id],
      bic: bankProfiles[id].defaultBic,
    };
    expect(validatePayer(settings)).toEqual([]);
    expect(
      validatePayer({
        ...settings,
        iban: accounts[id === "SEB" ? "LHV" : "SEB"],
      }).some((i) => i.field === "iban"),
    ).toBe(true);
    const result = evaluateInvoice(
      {
        ...blankInvoice(),
        supplierName: "Tarnija OÜ",
        supplierIban: "EE382200221020145685",
        supplierAddress: "Tee 1",
        invoiceNumber: "TEST-1",
        currency: "EUR",
        amountDue: "20.20",
        dueDate: "2030-10-20",
      },
      settings,
      { today: "2030-10-20", approved: true },
    );
    expect(result.issues.some((i) => i.code === "ADDRESS")).toBe(
      bankProfiles[id].requireTownAndCountryWithAddress,
    );
  }
});
