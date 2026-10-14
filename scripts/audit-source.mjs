import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parse } from "dotenv";

// Inspect exactly the version about to be committed, never print secret values.
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
if (!files.length) throw new Error("Stage the source files before running the source privacy audit.");
const env = parse(await readFile(".env", "utf8").catch(() => ""));
const secrets = Object.entries(env).filter(([key, value]) => /KEY|TOKEN|SECRET|PASSWORD/.test(key) && value.length >= 12).map(([, value]) => Buffer.from(value));
for (const file of files) {
  if (/^(data|test-results|release|node_modules|\.desktop|\.next|docs\/archive|docs\/bank-specs\/lhv\/examples)\//.test(file) ||
      /(^|\/)(Makseks-AI-andmed|ai-config\.json|\.env(?:\..*)?)($|\/)/.test(file) && file !== ".env.example" ||
      /\.(db|sqlite|sqlite3|pem|key|pfx|p12|pdf|exe|zip)(?:-(?:wal|shm))?$/i.test(file)) {
    throw new Error(`Private or generated path in Git index: ${file}`);
  }
  const contents = execFileSync("git", ["show", `:${file}`], { maxBuffer: 20 * 1024 * 1024 });
  if (secrets.some((secret) => contents.includes(secret)) || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(contents.toString("utf8")))
    throw new Error(`Credential detected in Git index: ${file}`);
}
console.log(`Source privacy audit PASS: ${files.length} staged/tracked files; no private paths or known local credentials.`);
