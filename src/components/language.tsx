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
import type { Theme, UIPreferences } from "@/lib/ui-preferences";

type LanguageContextValue = {
  language: Language;
  setLanguage: (next: Language) => Promise<void>;
  theme: Theme;
  setTheme: (next: Theme) => Promise<void>;
  saving: boolean;
  error: string;
  t: (source: string, values?: Record<string, string | number>) => string;
  message: (source: string) => string;
};
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>("et");
  const [theme, updateTheme] = useState<Theme>("system");
  const [themeReady, setThemeReady] = useState(false);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState("");
  const changed = useRef(new Set<keyof UIPreferences>());
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    if (!themeReady) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "system" ? media.matches ? "dark" : "light" : theme;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };
    apply();
    try { localStorage.setItem("makseks-theme", theme); } catch { /* Theme still works when storage is unavailable. */ }
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, themeReady]);
  useEffect(() => {
    let alive = true;
    void api<UIPreferences>("preferences")
      .then((preferences) => {
        if (
          alive &&
          !changed.current.has("language") &&
          (preferences.language === "en" || preferences.language === "et")
        ) {
          updateLanguage(preferences.language);
        }
        if (alive && !changed.current.has("theme") && ["light", "dark", "system"].includes(preferences.theme)) updateTheme(preferences.theme);
        if (alive) setThemeReady(true);
      })
      .catch(() => {
        if (alive)
          setError("Välimuse ja keele laadimine ebaõnnestus. Vali eelistused uuesti.");
      });
    return () => {
      alive = false;
    };
  }, []);
  const setLanguage = useCallback(async (next: Language) => {
    changed.current.add("language");
    updateLanguage(next);
    setPending((count) => count + 1);
    setError("");
    try {
      await api("preferences", "PUT", { language: next });
    } catch {
      setError("Keele salvestamine ebaõnnestus. Proovi uuesti.");
    } finally {
      setPending((count) => count - 1);
    }
  }, []);
  const setTheme = useCallback(async (next: Theme) => {
    changed.current.add("theme");
    updateTheme(next);
    setThemeReady(true);
    setPending((count) => count + 1);
    setError("");
    try {
      await api("preferences", "PUT", { theme: next });
    } catch {
      setError("Kujunduse salvestamine ebaõnnestus. Proovi uuesti.");
    } finally {
      setPending((count) => count - 1);
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
      value={{ language, setLanguage, theme, setTheme, saving: pending > 0, error, t, message }}
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
