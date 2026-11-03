import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// minimatch versions before 7 have no optimizationLevel/firstPhasePreProcess code path,
// which is where GHSA-g3hv-75wg-m249 lives; 9.x/10.x copies are overridden to 11.0.4.
const preOptimizationMinimatch = version => Number.parseInt(String(version).split(".")[0], 10) < 7;

export function evaluateAudit(report, lock) {
  if (report.error || !report.vulnerabilities || !lock.packages)
    throw new Error("Dependency audit did not return a valid result.");
  const vulnerabilities = report.vulnerabilities;
  function knownAdvisory(advisory, nodes) {
    if (advisory.name === "braces")
      return advisory.severity === "high" && advisory.url === "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";
    if (advisory.name === "minimatch")
      return advisory.severity === "moderate" && advisory.url === "https://github.com/advisories/GHSA-g3hv-75wg-m249" &&
        nodes.every(path => preOptimizationMinimatch(lock.packages[path]?.version));
    return false;
  }
  function knownDevelopmentChain(name, seen = new Set()) {
    const item = vulnerabilities[name];
    // A dependency cycle (e.g. eslint <-> eslint-utils) adds no new advisory; every package is evaluated separately.
    if (seen.has(name)) return true;
    if (!item || !item.nodes?.length || !item.via?.length) return false;
    if (item.nodes.some(path => lock.packages[path]?.dev !== true)) return false;
    const visited = new Set([...seen, name]);
    return item.via.every(advisory => typeof advisory === "string"
      ? knownDevelopmentChain(advisory, visited)
      : knownAdvisory(advisory, item.nodes));
  }
  const accepted = [], rejected = [];
  for (const name of Object.keys(vulnerabilities))
    (knownDevelopmentChain(name) ? accepted : rejected).push(name);
  return { accepted, rejected };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.env.npm_execpath) throw new Error("Run npm run audit:dependencies.");
    const audit = spawnSync(process.execPath, [process.env.npm_execpath, "audit", "--json"], {
      encoding: "utf8", windowsHide: true, timeout: 120000,
    });
    if (audit.error || ![0, 1].includes(audit.status)) throw new Error("npm audit could not finish.");
    const result = evaluateAudit(JSON.parse(audit.stdout), JSON.parse(readFileSync("package-lock.json", "utf8")));
    if (result.accepted.length)
      console.log(`Known development-only advisories (braces, pre-v7 minimatch): ${result.accepted.join(", ")}. See docs/SECURITY_REVIEW.md.`);
    if (result.rejected.length) throw new Error(`Unreviewed or production vulnerabilities: ${result.rejected.join(", ")}`);
    console.log("Dependency policy passed; no unreviewed or production vulnerabilities.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
