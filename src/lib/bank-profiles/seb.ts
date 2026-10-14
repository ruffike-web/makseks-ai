import type { BankProfile } from "./types";
export const sebProfile: BankProfile = {
  displayName: "SEB",
  defaultBic: "EEUHEE2X",
  estonianBankCodes: ["10"],
  requireTownAndCountryWithAddress: true,
  importNote:
    "SEB maksefaili import õnnestus kasutaja kinnituse põhjal 07.10.2026.",
  xml: {
    namespace: "urn:iso:std:iso:20022:tech:xsd:pain.001.001.09",
    serviceLevelElement: "Cd",
    batchBooking: null,
    paymentChargeBearer: null,
    transactionChargeBearer: null,
    includeInstructionId: false,
  },
  schema: {
    main: "docs/bank-specs/seb/xsd/pain.001.001.09_SEBv2.xsd",
    imports: {},
  },
};
