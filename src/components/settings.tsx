"use client";
import { useLanguage } from "./language";
import { useState } from "react";
import type { AppState } from "@/lib/service";
import type { Settings } from "@/lib/domain";
import { IconCheck, IconBuildingBank } from "@tabler/icons-react";
import { aiProviders } from "@/lib/ai-providers";
import { AISettings } from "./ai-settings";
import { bankOptions, bankProfiles } from "@/lib/bank-profiles";
export function SettingsView({
  state,
  save,
  busy,
  refresh,
  notify,
}: {
  state: AppState;
  save: (s: Settings) => Promise<void>;
  busy: boolean;
  refresh: () => Promise<unknown>;
  notify: (message: string) => void;
}) {
  const {
    t,
    language,
    setLanguage,
    saving: savingLanguage,
    error: languageError,
  } = useLanguage();
  const [form, setForm] = useState(state.settings);
  function field(key: keyof Settings, label: string, placeholder = "") {
    return (
      <label className="field">
        <span>{t(label)}</span>
        <input
          value={String(form[key])}
          placeholder={t(placeholder)}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      </label>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(form);
      }}
      className="settings-layout"
    >
      <div className="panel">
        <div className="panel-heading">
          <IconBuildingBank size={22} />
          <div>
            <h2>{t("Maksja ettevõte")}</h2>
            <p>{t("Need andmed lisatakse igasse maksefaili.")}</p>
          </div>
        </div>
        <div className="form-grid">
          {field(
            "companyName",
            t("Ettevõtte nimi"),
            t("Ettevõtte ametlik nimi"),
          )}
          {field("registrationCode", t("Registrikood"))}
          <label className="field">
            <span>{t("Pank")}</span>
            <select
              value={form.preferredBank}
              onChange={(e) =>
                setForm({
                  ...form,
                  preferredBank: e.target.value as Settings["preferredBank"],
                  bic: "",
                })
              }
            >
              {bankOptions.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.displayName}
                </option>
              ))}
            </select>
          </label>
          {field("iban", t("Maksja IBAN"), "EE…")}
          {field(
            "bic",
            t("Maksja BIC (valikuline)"),
            bankProfiles[form.preferredBank].defaultBic,
          )}
          {field("address", t("Aadress (valikuline)"))}
          {field("postalCode", t("Postiindeks"))}
          {field("town", t("Linn / asula"))}
          {field("countryCode", t("Riigikood"), "EE")}
        </div>
        <p className="help">
          {t(
            "Tühi BIC täidetakse valitud panga koodiga. Saaja andmeid sellest ei tuletata.",
          )}
        </p>
      </div>
      <div className="stack">
        <section className="panel">
          <h2>{t("Kasutajaliidese keel")}</h2>
          <label className="field">
            <span>Keel / Language</span>
            <select
              aria-label="Keel / Language"
              value={language}
              disabled={savingLanguage}
              onChange={(event) =>
                void setLanguage(event.target.value as "et" | "en")
              }
            >
              <option value="et">Eesti</option>
              <option value="en">English</option>
            </select>
          </label>
          <p className="help">
            {t("Keel muutub kohe ja salvestatakse kõigile ettevõtetele.")}
          </p>
          {languageError && (
            <p role="alert" className="notice warning">
              {t(languageError)}{" "}
              <button
                type="button"
                className="text-button"
                disabled={savingLanguage}
                onClick={() => void setLanguage(language)}
              >
                {t("Proovi uuesti")}
              </button>
            </p>
          )}
        </section>
        <section className="panel">
          <h2>{t("Makse kuupäev ja selgitus")}</h2>
          <label className="field">
            <span>{t("Vaikimisi makse kuupäev")}</span>
            <select
              value={form.dateMode}
              onChange={(e) =>
                setForm({
                  ...form,
                  dateMode: e.target.value as Settings["dateMode"],
                })
              }
            >
              <option value="due">{t("Arve maksetähtpäev")}</option>
              <option value="today">{t("Tänane päev")}</option>
              <option value="manual">{t("Määratud kuupäev")}</option>
            </select>
          </label>
          {form.dateMode === "manual" && (
            <label className="field">
              <span>{t("Makse kuupäev")}</span>
              <input
                type="date"
                min={state.today}
                value={form.manualDate}
                onChange={(e) =>
                  setForm({ ...form, manualDate: e.target.value })
                }
              />
            </label>
          )}
          <p className="help">
            {t(
              "Ületatud maksetähtpäeva asemel kasutatakse tänast Eesti kuupäeva.",
            )}
          </p>
          {field("descriptionTemplate", t("Selgitus ilma kliendinumbrita"))}
          {field("customerDescriptionTemplate", t("Selgitus kliendinumbriga"))}
          <p className="help">
            {t("Lubatud kohatäitjad:")} {"{invoiceNumber}"} {t("ja")}{" "}
            {"{customerNumber}"}
            {t(". Maksimaalselt 140 märki makses.")}
          </p>
        </section>
        <AISettings
          notify={notify}
          companyId={state.companyId}
          provider={state.aiProvider}
          providers={state.aiProviders}
          onProviderChanged={() => setForm({ ...form, aiEnabled: false })}
          refresh={refresh}
        />
        <section className="panel">
          <h2>{t("Arvete automaatne lugemine")}</h2>
          <p className="help">
            {aiProviders[state.aiProvider].name} · {state.aiModel}
          </p>
          <label className="check">
            <input
              type="checkbox"
              checked={
                form.aiEnabled && form.aiConsentProvider === state.aiProvider
              }
              disabled={!state.aiConfigured}
              onChange={(e) =>
                setForm({
                  ...form,
                  aiEnabled: e.target.checked,
                  aiConsentProvider: state.aiProvider,
                })
              }
            />
            <span>
              {t(
                "Luban selle ettevõtte arve PDF-i, teksti või pildi saata teenusele",
              )}{" "}
              {aiProviders[state.aiProvider].name} {t("andmete lugemiseks.")}
            </span>
          </label>
          <div className={state.aiConfigured ? "notice success" : "notice"}>
            {state.aiConfigured
              ? t("API-võti on serveris seadistatud.")
              : t(
                  "AI kasutamiseks sisesta API-võti ülal ja salvesta. Võtmeta saad kasutada kohalikku PDF-i lugemist või käsitsi sisestamist.",
                )}
          </div>
          <p className="help">
            {t(
              "Algfaili serveris ei säilitata. Tuvastatud andmed salvestatakse selle arvuti andmebaasi.",
            )}
          </p>
        </section>
        <button className="button primary" disabled={busy}>
          <IconCheck size={18} />
          {t("Salvesta seaded")}
        </button>
        <p className="help">
          {t("Seadete muutmise järel kontrolli ja kinnita arved uuesti.")}
        </p>
      </div>
    </form>
  );
}
