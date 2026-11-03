import { expect, it } from "vitest";
import { evaluateAudit } from "../scripts/audit-dependencies.mjs";

const lock = { packages: { "node_modules/braces": { dev: true }, "node_modules/micromatch": { dev: true } } };
const known = {
  vulnerabilities: {
    braces: { nodes: ["node_modules/braces"], via: [{ name: "braces", severity: "high", url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm" }] },
    micromatch: { nodes: ["node_modules/micromatch"], via: ["braces"] },
  },
};
it("accepts only the documented development-only braces advisory chain", () => {
  expect(evaluateAudit(known, lock)).toEqual({ accepted: ["braces", "micromatch"], rejected: [] });
});
it("blocks the same advisory if it reaches production dependencies", () => {
  expect(evaluateAudit(known, { packages: { ...lock.packages, "node_modules/braces": { dev: false } } }).rejected).toContain("braces");
});
it("blocks new advisories and audit failures instead of silently skipping them", () => {
  const report = structuredClone(known);
  report.vulnerabilities.braces.via[0].url = "https://github.com/advisories/GHSA-new-advisory";
  expect(evaluateAudit(report, lock).rejected).toEqual(["braces", "micromatch"]);
  expect(() => evaluateAudit({ error: "Registry unavailable" }, lock)).toThrow();
});

const minimatchAdvisory = { name: "minimatch", severity: "moderate", url: "https://github.com/advisories/GHSA-g3hv-75wg-m249" };
type LockPackages = Record<string, { dev: boolean; version: string }>;
type AuditEntry = { nodes: string[]; via: (string | typeof minimatchAdvisory)[] };
const minimatchLock: { packages: LockPackages } = { packages: {
  "node_modules/minimatch": { dev: true, version: "3.1.5" },
  "node_modules/filelist/node_modules/minimatch": { dev: true, version: "5.1.9" },
  "node_modules/glob": { dev: true, version: "7.2.3" },
} };
const minimatchReport = (): { vulnerabilities: Record<string, AuditEntry> } => ({ vulnerabilities: {
  minimatch: { nodes: ["node_modules/minimatch", "node_modules/filelist/node_modules/minimatch"], via: [{ ...minimatchAdvisory }] },
  glob: { nodes: ["node_modules/glob"], via: ["minimatch"] },
} });
it("accepts the minimatch advisory only for development copies without the vulnerable code path", () => {
  expect(evaluateAudit(minimatchReport(), minimatchLock)).toEqual({ accepted: ["minimatch", "glob"], rejected: [] });
});
it("blocks the minimatch advisory for 9.x/10.x copies, production use or a different advisory", () => {
  const modern = structuredClone(minimatchLock);
  modern.packages["node_modules/filelist/node_modules/minimatch"].version = "10.2.6";
  expect(evaluateAudit(minimatchReport(), modern).rejected).toEqual(["minimatch", "glob"]);
  const production = structuredClone(minimatchLock);
  production.packages["node_modules/minimatch"].dev = false;
  expect(evaluateAudit(minimatchReport(), production).rejected).toContain("minimatch");
  const other = minimatchReport();
  (other.vulnerabilities.minimatch.via[0] as typeof minimatchAdvisory).url = "https://github.com/advisories/GHSA-new-advisory";
  expect(evaluateAudit(other, minimatchLock).rejected).toEqual(["minimatch", "glob"]);
});
it("follows dependency cycles without rejecting or hiding advisories", () => {
  const report = minimatchReport();
  const lock = structuredClone(minimatchLock);
  lock.packages["node_modules/eslint"] = { dev: true, version: "9.39.5" };
  lock.packages["node_modules/eslint-utils"] = { dev: true, version: "4.9.1" };
  report.vulnerabilities.eslint = { nodes: ["node_modules/eslint"], via: ["minimatch", "eslint-utils"] };
  report.vulnerabilities["eslint-utils"] = { nodes: ["node_modules/eslint-utils"], via: ["eslint"] };
  expect(evaluateAudit(report, lock).rejected).toEqual([]);
  (report.vulnerabilities.minimatch.via[0] as typeof minimatchAdvisory).url = "https://github.com/advisories/GHSA-new-advisory";
  expect(evaluateAudit(report, lock).rejected).toEqual(["minimatch", "glob", "eslint", "eslint-utils"]);
});
