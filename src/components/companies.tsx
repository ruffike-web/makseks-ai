"use client";
import { LanguageProvider, useLanguage } from "./language";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { CompanyWorkspace } from "./workspace";

export type Company = { id: string; name: string };
const storageKey = "arve-makseks-company";
export function Workspace() {
  return (
    <LanguageProvider>
      <CompanySelector />
    </LanguageProvider>
  );
}
function CompanySelector() {
  const { t, message: translateMessage } = useLanguage();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState("");
  const select = useCallback((id: string) => {
    try {
      sessionStorage.setItem(storageKey, id);
    } catch {
      /* Session storage may be disabled. */
    }
    setActive(id);
  }, []);
  const reloadCompanies = useCallback(async () => {
    const next = await api<Company[]>("companies");
    setCompanies(next);
  }, []);
  useEffect(() => {
    let alive = true;
    void api<Company[]>("companies")
      .then((next) => {
        if (!alive) return;
        let stored: string | null = null;
        try {
          stored = sessionStorage.getItem(storageKey);
        } catch {
          /* Optional persistence. */
        }
        const chosen =
          next.find((c) => c.id === stored) ??
          next.find((c) => c.id === "default") ??
          next[0];
        if (!chosen)
          throw new Error(
            "Ettevõtte andmed puuduvad. Käivita andmebaasi seadistamine.",
          );
        setCompanies(next);
        select(chosen.id);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [select]);
  if (!active)
    return (
      <main className="loading">
        {error ? (
          <div role="alert">
            {translateMessage(error)}
            <button
              className="button secondary"
              onClick={() => location.reload()}
            >
              {t("Proovi uuesti")}
            </button>
          </div>
        ) : (
          t("Laadin ettevõtteid…")
        )}
      </main>
    );
  return (
    <CompanyWorkspace
      key={active}
      companyId={active}
      companies={companies}
      switchCompany={select}
      reloadCompanies={reloadCompanies}
      createCompany={async (name) => {
        const company = await api<Company>("companies", "POST", { name });
        setCompanies((old) => [...old, company]);
        select(company.id);
      }}
    />
  );
}
