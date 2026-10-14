import { readdir, stat, unlink } from "node:fs/promises";
import { resolve, relative, sep, basename } from "node:path";

// Only build-stage files. Keep runtime code, licenses, fonts and SQLite engines.
export function unusedRuntimeFile(path) {
  const normalized = path.replaceAll("\\", "/");
  return normalized.endsWith(".map") ||
    (/\/node_modules\/@prisma\/client(?:-[^/]+)?\/runtime\//.test(`/${normalized}`) &&
      /^query_compiler_.*\.(postgresql|mysql|sqlserver|cockroachdb)\./.test(basename(normalized)));
}
export async function pruneRuntime(root) {
  const expected = resolve(".desktop/server");
  if (resolve(root) !== expected) throw new Error("Refusing to prune outside server build stage");
  let bytes = 0, files = 0;
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = resolve(dir, entry.name);
      const local = relative(expected, file);
      if (local.startsWith(`..${sep}`) || entry.isSymbolicLink()) throw new Error("Unsafe staging entry");
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && unusedRuntimeFile(local)) {
        bytes += (await stat(file)).size;
        await unlink(file); files++;
      }
    }
  }
  await walk(expected);
  console.log(`Removed ${files} unused build files (${(bytes / 1024 / 1024).toFixed(1)} MiB).`);
}
