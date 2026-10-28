import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export const uiPreferencesSchema = z.object({
  language: z.enum(["et", "en"]),
  theme: z.enum(["light", "dark", "system"]).default("system"),
}).strict();
export type UIPreferences = z.infer<typeof uiPreferencesSchema>;
export type Theme = UIPreferences["theme"];
const preferencesUpdateSchema = z.object({
  language: z.enum(["et", "en"]).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
}).strict().refine(
  (value) => value.language !== undefined || value.theme !== undefined,
  "Choose a language or theme.",
);
function preferencesPath() {
  return resolve(process.env.ARVE_DATA_DIR || "data", "ui-preferences.json");
}
export function readUIPreferences(): UIPreferences {
  try {
    return uiPreferencesSchema.parse(JSON.parse(readFileSync(/* turbopackIgnore: true */ preferencesPath(), "utf8")));
  } catch { return { language: "et", theme: "system" }; }
}
export function saveUIPreferences(input: unknown) {
  const changes = preferencesUpdateSchema.parse(input);
  const next = uiPreferencesSchema.parse({ ...readUIPreferences(), ...changes });
  const file = preferencesPath();
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(next), { mode: 0o600 });
  renameSync(temporary, file);
  return next;
}
