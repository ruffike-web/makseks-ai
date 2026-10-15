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
