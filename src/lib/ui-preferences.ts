import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export const uiPreferencesSchema = z.object({ language: z.enum(["et", "en"]) }).strict();
function preferencesPath() {
  return resolve(process.env.ARVE_DATA_DIR || "data", "ui-preferences.json");
}
export function readUIPreferences(): { language: "et" | "en" } {
  try {
    return uiPreferencesSchema.parse(JSON.parse(readFileSync(/* turbopackIgnore: true */ preferencesPath(), "utf8")));
  } catch { return { language: "et" }; }
}
export function saveUIPreferences(input: unknown) {
  const next = uiPreferencesSchema.parse(input);
  const file = preferencesPath();
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(next), { mode: 0o600 });
  renameSync(temporary, file);
  return next;
}
