import { expect, it } from "vitest";
import { nextExportSelection } from "../src/lib/export-selection";

it("keeps an unticked ready invoice out of the export after a refresh", () => {
  expect(nextExportSelection(["a"], ["a", "b"], ["a", "b"])).toEqual(["a"]);
});
it("selects newly ready invoices and drops invoices that are no longer ready", () => {
  expect(nextExportSelection(["a"], ["a", "b"], ["b", "c"])).toEqual(["c"]);
  expect(nextExportSelection([], [], ["a", "b"])).toEqual(["a", "b"]);
});
it("re-selects an invoice that left the ready list and became ready again", () => {
  expect(nextExportSelection([], ["a"], [])).toEqual([]);
  expect(nextExportSelection([], [], ["a"])).toEqual(["a"]);
});
