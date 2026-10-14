import { describe, it, expect } from "vitest";
import { blankInvoice } from "../src/lib/domain";
import {
  validateUpload,
  parseExtractionResponse,
  extractInvoice,
  nativePdfText,
  type ExtractionProvider,
} from "../src/lib/extraction";
import { invoicePdf } from "./pdf-fixture";
const png = Buffer.from("89504e470d0a1a0a00000000", "hex");
describe("uploads and extraction", () => {
  it("sends the PDF as well as native text so supplier logos remain visible", async () => {
    const bytes = invoicePdf();
    expect(await nativePdfText(bytes)).toContain("Amount due EUR 104.00");
    const received: string[] = [];
    const provider: ExtractionProvider = {
      extract: async (input) => {
        received.push(input.mime);
        expect(input.bytes).toEqual(bytes);
        expect(input.text).toContain("104.00");
        return { ...blankInvoice(), amountDue: "104.00" };
      },
    };
    const result = await extractInvoice(bytes, "application/pdf", provider);
    expect(result.method).toBe("vision-gemini");
    expect(result.data.amountDue).toBe("104.00");
    expect(received).toEqual(["application/pdf"]);
  });
  it("rejects spoofed MIME, unsupported formats and oversized files", () => {
    expect(() =>
      validateUpload(
        Buffer.from("<script>bad</script>"),
        "image/png",
        "x.png",
        10,
      ),
    ).toThrow();
    expect(() => validateUpload(png, "application/pdf", "x.pdf", 10)).toThrow();
    expect(() => validateUpload(png, "image/png", "x.png", 0.000001)).toThrow();
    expect(validateUpload(png, "image/png", "../../a.png", 10).name).toBe(
      "a.png",
    );
  });
  it("enforces strict structured responses and never invents missing data", () => {
    const v = blankInvoice();
    expect(parseExtractionResponse(JSON.stringify(v)).amountDue).toBeNull();
    expect(() => parseExtractionResponse('{"supplierName":"Test"}')).toThrow();
    expect(() =>
      parseExtractionResponse(JSON.stringify({ ...v, extra: "instruction" })),
    ).toThrow();
    expect(() =>
      parseExtractionResponse(JSON.stringify({ ...v, amountDue: 123 })),
    ).toThrow();
    expect(() => parseExtractionResponse("not json")).toThrow();
  });
  it("keeps manual entry available without provider and isolates provider failures", async () => {
    const noProvider = await extractInvoice(png, "image/png", null);
    expect(noProvider.data.supplierIban).toBeNull();
    expect(noProvider.note).toContain("käsitsi");
    const provider: ExtractionProvider = {
      extract: async () => {
        throw new Error("secret provider info");
      },
    };
    const failed = await extractInvoice(png, "image/png", provider);
    expect(failed.data.amountDue).toBeNull();
    expect(failed.note).not.toContain("secret");
  });
});
