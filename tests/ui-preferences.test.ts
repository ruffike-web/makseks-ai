import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readUIPreferences, saveUIPreferences } from "../src/lib/ui-preferences";
afterEach(() => vi.unstubAllEnvs());
it("defaults to Estonian and persists language separately from company/payment settings", () => {
  const dir = mkdtempSync(join(tmpdir(), "makseks-language-"));
  vi.stubEnv("ARVE_DATA_DIR", dir);
  expect(readUIPreferences()).toEqual({ language: "et" });
  saveUIPreferences({ language: "en" });
  expect(readUIPreferences()).toEqual({ language: "en" });
  expect(JSON.parse(readFileSync(join(dir, "ui-preferences.json"), "utf8"))).toEqual({ language: "en" });
  expect(() => saveUIPreferences({ language: "xx" })).toThrow();
  expect(() => saveUIPreferences({ language: "et", apiKey: "anything" })).toThrow();
  expect(readUIPreferences()).toEqual({ language: "en" });
});
