import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readUIPreferences, saveUIPreferences } from "../src/lib/ui-preferences";
const directories: string[] = [];
function dataDirectory() {
  const dir = mkdtempSync(join(tmpdir(), "makseks-preferences-"));
  directories.push(dir);
  vi.stubEnv("ARVE_DATA_DIR", dir);
  return dir;
}
afterEach(() => {
  vi.unstubAllEnvs();
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});
it("defaults to Estonian and persists language separately from company/payment settings", () => {
  const dir = dataDirectory();
  expect(readUIPreferences()).toEqual({ language: "et", theme: "system" });
  saveUIPreferences({ language: "en" });
  expect(readUIPreferences()).toEqual({ language: "en", theme: "system" });
  expect(JSON.parse(readFileSync(join(dir, "ui-preferences.json"), "utf8"))).toEqual({ language: "en", theme: "system" });
  expect(() => saveUIPreferences({ language: "xx" })).toThrow();
  expect(() => saveUIPreferences({ language: "et", apiKey: "anything" })).toThrow();
  expect(readUIPreferences()).toEqual({ language: "en", theme: "system" });
});
it("reads legacy language preferences and merges independent appearance updates", () => {
  const dir = dataDirectory();
  writeFileSync(join(dir, "ui-preferences.json"), JSON.stringify({ language: "en" }));
  expect(readUIPreferences()).toEqual({ language: "en", theme: "system" });
  saveUIPreferences({ theme: "dark" });
  expect(readUIPreferences()).toEqual({ language: "en", theme: "dark" });
  saveUIPreferences({ language: "et" });
  expect(readUIPreferences()).toEqual({ language: "et", theme: "dark" });
  saveUIPreferences({ theme: "light" });
  expect(readUIPreferences()).toEqual({ language: "et", theme: "light" });
  expect(() => saveUIPreferences({ theme: "sepia" })).toThrow();
  expect(() => saveUIPreferences({})).toThrow();
  expect(readUIPreferences()).toEqual({ language: "et", theme: "light" });
});
