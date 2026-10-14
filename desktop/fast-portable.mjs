import { cp, mkdir, readFile, rm, writeFile, access } from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const root = process.cwd();
const releaseDirectory = resolve(process.env.ARVE_RELEASE_DIR || "release");
const stage = resolve(root, ".desktop/fast-portable");
if (relative(root, stage) !== join(".desktop", "fast-portable"))
  throw new Error("Unsafe staging path");
const app = join(stage, "Makseks AI");
try {
  await access(join(app, "Makseks-AI-andmed"));
  throw new Error(
    "Build staging contains user data; move it before rebuilding.",
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
await cp(join(releaseDirectory, "win-unpacked"), app, {
  recursive: true,
  dereference: true,
});
await writeFile(
  join(app, "Makseks-AI.portable"),
  "Makseks AI portable directory. Keep this file beside the executable.\n",
);
await writeFile(
  join(app, "ALUSTA-SIIT.txt"),
  "Makseks AI – kiire portable\r\n\r\n1. Paki kogu ZIP-kaust lahti.\r\n2. Käivita Makseks AI.exe. Ära käivita EXE-d ZIP-i seest.\r\n3. Hoia kõik programmi failid koos. Andmed tekivad kausta Makseks-AI-andmed.\r\n\r\nVana portable-versiooni andmete säilitamiseks sulge vana programm ja kopeeri selle Makseks-AI-andmed kaust uue EXE kõrvale. Ära kirjuta olemasolevat andmekausta üle ilma varukoopiata.\r\n",
);
const { version } = JSON.parse(
  await readFile("desktop/app/package.json", "utf8"),
);
await writeFile(
  join(app, "START-HERE.txt"),
  "Makseks AI – fast portable\r\n\r\n1. Extract the entire ZIP archive.\r\n2. Run Makseks AI.exe from the extracted folder.\r\n3. Keep all program files together. Your data is stored in Makseks-AI-andmed beside the executable.\r\n4. For English, open Seaded, find Keel / Language and select English.\r\n\r\nTo keep data from an earlier portable version, close the old app and copy its Makseks-AI-andmed folder beside the new executable. Back up any existing destination data before replacing it.\r\n",
);
const archive = join(releaseDirectory, `Makseks-AI-${version}-portable-kiire.zip`);
await rm(archive, { force: true });
await promisify(execFile)(
  resolve("node_modules/electron-winstaller/vendor/7z.exe"),
  ["a", "-tzip", "-mx=9", "-y", archive, "Makseks AI"],
  { cwd: stage, windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
);
console.log(`Fast portable ZIP created: ${archive}`);
