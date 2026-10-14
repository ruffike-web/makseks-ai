import { readFile, readdir, access } from "node:fs/promises";
import { join, basename, relative, resolve } from "node:path";
import { parse } from "dotenv";

const root = resolve(process.env.ARVE_RELEASE_DIR || "release", "win-unpacked/resources");
for (const file of [
  "server/node_modules/next/package.json",
  "server/node_modules/better-sqlite3/build/Release/better_sqlite3.node",
  "server/node_modules/pdf-parse/package.json",
  "server/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
  "server/node_modules/@napi-rs/canvas-win32-x64-msvc/skia.win32-x64-msvc.node",
  "server/node_modules/libxml2-wasm/package.json",
])
  await access(join(root, file));
const env = parse(await readFile(".env", "utf8").catch(() => ""));
const secrets = Object.entries(env)
  .filter(
    ([key, value]) =>
      /KEY|TOKEN|SECRET|PASSWORD/.test(key) && value.length >= 12,
  )
  .map(([, value]) => Buffer.from(value));
let count = 0;
async function audit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      await audit(file);
      continue;
    }
    if (
      basename(file).startsWith(".env") ||
      /^(ai-config\.json|ai\.env)$/.test(entry.name) ||
      /\.(db|sqlite|sqlite3)(-wal|-shm)?$/i.test(entry.name)
    )
      throw new Error(`Private file in release: ${relative(root, file)}`);
    const contents = await readFile(file);
    if (secrets.length && secrets.some((secret) => contents.includes(secret)))
      throw new Error(
        "A private credential was found in the release; do not distribute.",
      );
    count++;
  }
}
await audit(root);
console.log(
  `Release privacy audit PASS: ${count} files, no databases, configuration files or known local credentials.`,
);
