import type { BankProfile } from "./types";
export const coopProfile: BankProfile = {
  displayName: "Coop Pank",
  defaultBic: "EKRDEE22",
  estonianBankCodes: ["42"],
  requireTownAndCountryWithAddress: true,
  importNote: "Coop Panga internetipanga import on veel katsetamata.",
  xml: {
    namespace: "urn:iso:std:iso:20022:tech:xsd:pain.001.001.09",
    serviceLevelElement: "Cd",
    batchBooking: false,
    paymentChargeBearer: "SLEV",
    transactionChargeBearer: null,
    includeInstructionId: true,
    referenceDescription: "domestic-unstructured",
  },
  schema: {
    main: "docs/bank-specs/coop/xsd/pain.001.001.09.xsd",
    imports: {},
  },
};
