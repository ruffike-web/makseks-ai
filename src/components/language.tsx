"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { translate, translateMessage, type Language } from "@/lib/i18n";
import { api } from "./api";

type LanguageContextValue = {
  language: Language;
  setLanguage: (next: Language) => Promise<void>;
  saving: boolean;
  error: string;
  t: (source: string, values?: Record<string, string | number>) => string;
  message: (source: string) => string;
};
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>("et");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const changed = useRef(false);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    let alive = true;
    void api<{ language: Language }>("preferences")
      .then((preferences) => {
        if (
          alive &&
          !changed.current &&
          (preferences.language === "en" || preferences.language === "et")
        ) {
          updateLanguage(preferences.language);
        }
      })
      .catch(() => {
        if (alive)
          setError("Keele-eelistuse laadimine ebaõnnestus. Vali keel uuesti.");
      });
    return () => {
      alive = false;
    };
  }, []);
  const setLanguage = useCallback(async (next: Language) => {
    changed.current = true;
    updateLanguage(next);
    setSaving(true);
    setError("");
    try {
      await api("preferences", "PUT", { language: next });
    } catch {
      setError("Keele salvestamine ebaõnnestus. Proovi uuesti.");
    } finally {
      setSaving(false);
    }
  }, []);
  const t = useCallback(
    (source: string, values?: Record<string, string | number>) => {
      return translate(language, source, values);
    },
    [language],
  );
  const message = useCallback(
    (source: string) => translateMessage(language, source),
    [language],
  );
  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, saving, error, t, message }}
    >
      <div lang={language} style={{ display: "contents" }}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("LanguageProvider is required");
  return context;
}
