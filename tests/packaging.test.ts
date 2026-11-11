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

it("packages every local module the desktop shell requires", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const { createRequire } = await import("node:module");
  const builder = createRequire(import.meta.url)("../desktop/builder.cjs") as { files: string[] };
  const shipped = new Set(builder.files);
  const sources = readdirSync("desktop/app").filter((name) => name.endsWith(".cjs"));
  const pending: string[] = sources.filter((name) => name === "main.cjs");
  const seen = new Set<string>();
  while (pending.length) {
    const name = pending.pop()!;
    if (seen.has(name)) continue;
    seen.add(name);
    expect(shipped, `${name} must be in desktop/builder.cjs files`).toContain(name);
    const code = readFileSync(`desktop/app/${name}`, "utf8");
    for (const match of code.matchAll(/require\(\s*["']\.\/([^"']+)["']\s*\)/g)) pending.push(match[1]);
    for (const match of code.matchAll(/["']([\w-]+\.html)["']/g)) {
      expect(shipped, `${match[1]} must be in desktop/builder.cjs files`).toContain(match[1]);
    }
  }
  expect([...seen].sort()).toEqual(["key-protection.cjs", "main.cjs", "paths.cjs"]);
});
