import type { BankProfile } from "./types";
export const swedbankProfile: BankProfile = {
  displayName: "Swedbank",
  defaultBic: "HABAEE2X",
  estonianBankCodes: ["22"],
  requireTownAndCountryWithAddress: true,
  maxCreditorNameLength: 70,
  importNote: "Swedbanki internetipanga import on veel katsetamata.",
  xml: {
    namespace: "urn:iso:std:iso:20022:tech:xsd:pain.001.001.09",
    serviceLevelElement: "Cd",
    batchBooking: false,
    paymentChargeBearer: "SLEV",
    transactionChargeBearer: null,
    includeInstructionId: true,
    referenceDescription: "domestic-unstructured",
    domesticRemittanceMaxLength: 130,
  },
  schema: {
    main: "docs/bank-specs/swedbank/xsd/pain.001.001.09-Swed.xsd",
    imports: {},
  },
};
