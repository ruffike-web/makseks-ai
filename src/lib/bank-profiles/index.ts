import { sebProfile } from "./seb";
import { lhvProfile } from "./lhv";
import { coopProfile } from "./coop";
import { swedbankProfile } from "./swedbank";
import type { BankProfile } from "./types";
export type { BankProfile } from "./types";
// Add a reviewed profile here to enable it in settings, validation and export.
export const bankProfiles = {
  SEB: sebProfile,
  LHV: lhvProfile,
  COOP: coopProfile,
  SWEDBANK: swedbankProfile,
} satisfies Record<string, BankProfile>;
export type Bank = keyof typeof bankProfiles;
export const bankIds = Object.keys(bankProfiles) as [Bank, ...Bank[]];
export const bankOptions = bankIds.map((id) => ({
  id,
  displayName: bankProfiles[id].displayName,
}));
export const defaultBank: Bank = "SEB";
