import type { BankProfile } from "./types";
export const lhvProfile: BankProfile = {
  displayName: "LHV",
  defaultBic: "LHVBEE22",
  estonianBankCodes: ["77"],
  requireTownAndCountryWithAddress: false,
  importNote: "LHV internetipanga import on veel katsetamata.",
  xml: {
    namespace: "urn:iso:std:iso:20022:tech:xsd:pain.001.001.09",
    serviceLevelElement: "Prtry",
    batchBooking: false,
    paymentChargeBearer: "SHAR",
    transactionChargeBearer: "SHAR",
    includeInstructionId: true,
  },
  schema: {
    main: "docs/bank-specs/lhv/xsd/pain.001.001.09.xml",
    imports: {
      "supl.001.001.01.xsd": "docs/bank-specs/lhv/xsd/supl.001.001.01.xsd",
    },
  },
};
