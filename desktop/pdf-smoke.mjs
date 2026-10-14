import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { invoicePdf } from "../tests/pdf-fixture.ts";
if (process.argv[2] === "--verify") {
  const { PDFParse } = await import(
    pathToFileURL(
      join(
        process.argv[3],
        "node_modules/pdf-parse/dist/pdf-parse/esm/index.js",
      ),
    ).href
  );
  const parser = new PDFParse({ data: invoicePdf(), isEvalSupported: false });
  try {
    const result = await parser.getText({ first: 20 });
    if (!result.text.includes("Amount due EUR 104.00"))
      throw new Error("Missing PDF text");
  } finally {
    await parser.destroy();
  }
  process.exit(0);
}
const directory = await mkdtemp(join(tmpdir(), "makseks-pdf-test-"));
try {
  for (const name of ["pdf-parse", "pdfjs-dist", "@napi-rs"])
    await cp(
      join(".desktop/server/node_modules", name),
      join(directory, "node_modules", name),
      { recursive: true },
    );
  await promisify(execFile)(
    process.execPath,
    [fileURLToPath(import.meta.url), "--verify", directory],
    { windowsHide: true },
  );
  console.log("Isolated staged PDF runtime PASS");
} finally {
  // This unique directory was created by this process under the OS temp root.
  if (directory.startsWith(join(tmpdir(), "makseks-pdf-test-")))
    await rm(directory, { recursive: true, force: true });
}
