"use client";
import { useLanguage } from "./language";
import { useState } from "react";
import type { SupplierData } from "@/lib/suppliers";

const fields = {
  name: "Tarnija nimi",
  registrationCode: "Registrikood",
  bic: "BIC",
  address: "Aadressirida",
  street: "Tänav",
  buildingNumber: "Maja number",
  postalCode: "Postiindeks",
  town: "Linn / asula",
  countryCode: "Riigikood",
} as const;
export function SupplierEditor({
  supplier,
  busy,
  error,
  close,
  save,
}: {
  supplier: SupplierData;
  busy: boolean;
  error?: string;
  close: () => void;
  save: (data: SupplierData) => Promise<void>;
}) {
  const { t, message: translateMessage } = useLanguage();
  const [form, setForm] = useState(supplier);
  const [accounts, setAccounts] = useState(supplier.trustedIbans.join("\n"));
  const dirty =
    JSON.stringify(form) !== JSON.stringify(supplier) ||
    accounts !== supplier.trustedIbans.join("\n");
  return (
    <div className="modal-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-title"
        className="editor"
        style={{ maxWidth: 680 }}
      >
        <header className="editor-heading">
          <h2 id="supplier-title">{t("Muuda tarnijat")}</h2>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => {
              if (
                !dirty ||
                window.confirm(t("Sulgen salvestamata muudatused?"))
              )
                close();
            }}
          >
            {t("Sulge")}
          </button>
        </header>
        <form
          className="editor-form"
          style={{ overflowY: "auto" }}
          onSubmit={(e) => {
            e.preventDefault();
            void save({
              ...form,
              trustedIbans: accounts
                .split(/[\n,;]+/)
                .map((v) => v.trim())
                .filter(Boolean),
            });
          }}
        >
          {error && (
            <p role="alert" className="notification error">
              {translateMessage(error)}
            </p>
          )}
          <p className="help">
            {t(
              "Järgmistel importidel kasutatakse parandatud nime ja aadressi, kui registrikood või kinnitatud IBAN tuvastab tarnija üheselt. Olemasoleva arve saad uuendada arve kontrollivaates.",
            )}
          </p>
          <div className="form-grid">
            {Object.entries(fields).map(([key, label]) => {
              const field = key as keyof typeof fields;
              return (
                <label className="field" key={field}>
                  <span>{t(label)}</span>
                  <input
                    disabled={busy}
                    required={field === "name"}
                    value={form[field] ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [field]:
                          field === "countryCode" || field === "bic"
                            ? e.target.value.toUpperCase()
                            : e.target.value,
                      })
                    }
                  />
                </label>
              );
            })}
          </div>
          <label className="field">
            <span>{t("Kinnitatud IBAN-id (üks konto real)")}</span>
            <textarea
              disabled={busy}
              required
              rows={3}
              value={accounts}
              onChange={(e) => setAccounts(e.target.value)}
            />
          </label>
          <p className="help">
            {t(
              "Salvesta ainult kontrollitud pangakontod. Arvelt loetud erinev konto jääb eraldi kontrollimiseks alles. Tarnija muutmisel vajavad tema seni kinnitatud, ekspordimata arved uut kinnitamist.",
            )}
          </p>
          <div className="editor-actions">
            <button className="button primary" disabled={busy || !dirty}>
              {t("Salvesta tarnija")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
