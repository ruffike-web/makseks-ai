import { expect, it } from "vitest";
import { orderPdfLines, readPdfLayout } from "../src/lib/pdf-layout";
import { invoicePdf } from "./pdf-fixture";

it("orders text geometrically, keeps columns, and joins split words", () => {
  const lines = orderPdfLines(
    [
      { text: "104.00", x: 400, y: 100, width: 40, height: 10 },
      { text: "da EUR", x: 128, y: 100, width: 35, height: 10 },
      { text: "Tasu", x: 100, y: 100, width: 28, height: 10 },
      { text: "Arve nr: TEST-2", x: 100, y: 50, width: 90, height: 10 },
    ],
    1,
  );
  expect(lines.map((line) => line.cells.map((c) => c.text))).toEqual([
    ["Arve nr: TEST-2"],
    ["Tasuda EUR", "104.00"],
  ]);
});
it("extracts bounded local layout from a real PDF using the bundled PDF engine", async () => {
  const layout = await readPdfLayout(
    invoicePdf(["Invoice no: TEST-1", "Amount due EUR 104.00"]),
  );
  expect(
    layout.map((line) => line.cells.map((c) => c.text).join(" ")).join("\n"),
  ).toContain("Amount due EUR 104.00");
});
