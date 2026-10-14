/** Client-safe bank rules; no filesystem or XML-library dependencies. */
export interface BankProfile {
  displayName: string;
  defaultBic: string;
  estonianBankCodes: readonly string[];
  requireTownAndCountryWithAddress: boolean;
  importNote: string;
  maxCreditorNameLength?: number;
  xml: {
    namespace: string;
    serviceLevelElement: "Cd" | "Prtry";
    batchBooking: boolean | null;
    paymentChargeBearer: "SHAR" | "SLEV" | null;
    transactionChargeBearer: "SHAR" | "SLEV" | null;
    includeInstructionId: boolean;
    referenceDescription?: "additional" | "domestic-unstructured";
    domesticRemittanceMaxLength?: number;
  };
  schema: { main: string; imports: Readonly<Record<string, string>> };
}
