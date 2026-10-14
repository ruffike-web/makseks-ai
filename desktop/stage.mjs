import { cp, mkdir, readdir, stat, writeFile, rm } from "node:fs/promises";
import { resolve, relative, basename, join } from "node:path";
import { pruneRuntime } from "./prune-runtime.mjs";
const root = process.cwd();
const stage = resolve(root, ".desktop/server");
if (relative(root, stage) !== join(".desktop", "server"))
  throw new Error("Unsafe staging path");
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
// Explicit allowlist: never distribute .env, real databases, uploads or backups.
const allowed = [".next", "node_modules", "server.js", "package.json"];
for (const name of allowed) {
  await cp(join(root, ".next/standalone", name), join(stage, name), {
    recursive: true,
    dereference: true,
    filter: (path) => !basename(path).startsWith(".env"),
  });
}
await cp(".next/static", join(stage, ".next/static"), { recursive: true });
// PDF.js loads this optional native dependency dynamically, outside Next's trace.
await cp("node_modules/pdfjs-dist", join(stage, "node_modules/pdfjs-dist"), {
  recursive: true,
  dereference: true,
});
for (const name of ["canvas", "canvas-win32-x64-msvc"])
  await cp(
    `node_modules/@napi-rs/${name}`,
    join(stage, `node_modules/@napi-rs/${name}`),
    { recursive: true, dereference: true },
  );
for (const entry of await readdir("docs/bank-specs", { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const source = join("docs/bank-specs", entry.name, "xsd");
  if (await stat(source).catch(() => null))
    await cp(source, join(stage, source), { recursive: true });
}
await mkdir(".desktop/runtime", { recursive: true });
await cp(process.execPath, ".desktop/runtime/node.exe");
await cp("desktop/NODE-LICENSE.txt", ".desktop/runtime/LICENSE.txt");
await writeFile(
  ".desktop/runtime/RUNTIME.txt",
  `Node.js ${process.version}; https://nodejs.org/\nBundled separately to preserve native SQLite module compatibility.\n`,
);
async function audit(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (
      entry.name.startsWith(".env") ||
      entry.name === "ai-config.json" ||
      entry.name === "ai.env" ||
      /\.(db|sqlite|sqlite3)(-wal|-shm)?$/i.test(entry.name)
    )
      throw new Error(`Private file in release: ${relative(stage, p)}`);
    if (entry.isDirectory()) await audit(p);
  }
}
await pruneRuntime(stage);
await audit(stage);
if (!(await stat(".desktop/runtime/node.exe")).size)
  throw new Error("Missing runtime");
console.log("Desktop runtime staged; private-file audit passed.");
