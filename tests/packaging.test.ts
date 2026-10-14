import { expect, it } from "vitest";
import { unusedRuntimeFile, pruneRuntime } from "../desktop/prune-runtime.mjs";
it("removes debug maps and unused database engines while retaining SQLite and PDF assets", () => {
  expect(unusedRuntimeFile("node_modules/pdfjs-dist/build/pdf.mjs.map")).toBe(true);
  expect(unusedRuntimeFile(".next/node_modules/@prisma/client-123/runtime/query_compiler_fast_bg.mysql.wasm-base64.mjs")).toBe(true);
  for (const path of [
    ".next/node_modules/@prisma/client-123/runtime/query_compiler_fast_bg.sqlite.wasm-base64.mjs",
    "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    "node_modules/pdfjs-dist/cmaps/Adobe-Japan1-UCS2.bcmap",
    "node_modules/pdfjs-dist/standard_fonts/FoxitSans.pfb",
    "node_modules/@napi-rs/canvas-win32-x64-msvc/icudtl.dat",
    "node_modules/next/LICENSE",
  ]) expect(unusedRuntimeFile(path)).toBe(false);
});
it("refuses to prune user data or project dependencies", async () => {
  await expect(pruneRuntime("data")).rejects.toThrow("outside");
  await expect(pruneRuntime("node_modules")).rejects.toThrow("outside");
});
