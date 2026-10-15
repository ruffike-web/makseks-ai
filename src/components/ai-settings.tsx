"use client";
import { useLanguage } from "./language";
import { useState } from "react";
import { api } from "./api";
import {
  aiProviders,
  aiProviderIds,
  suggestedAIModels,
  type AIProviderId,
} from "@/lib/ai-providers";
export function AISettings({
  companyId,
  provider: initialProvider,
  providers,
  refresh,
  onProviderChanged,
  notify,
}: {
  companyId: string;
  provider: AIProviderId;
  providers: Record<AIProviderId, { configured: boolean; model: string; locked?: boolean }>;
  refresh: () => Promise<unknown>;
  onProviderChanged: () => void;
  notify: (message: string) => void;
}) {
  const { t, message: translateMessage } = useLanguage();
  const [provider, setProvider] = useState(initialProvider);
  const [model, setModel] = useState(providers[initialProvider].model);
  const [key, setKey] = useState("");
  const [models, setModels] = useState<{ id: string; name: string }[] | null>(
    null,
  );
  const choices = models ?? suggestedAIModels[provider];
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false);
  const configured = providers[provider].configured;
  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    notify("");
    setError(false);
    try {
      await action();
    } catch (e) {
      setError(true);
      setMessage(e instanceof Error ? e.message : "Toiming ebaõnnestus.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>{t("AI ühendus")}</h2>
      {providers[provider].locked && (
        <p className="notice warning" role="alert">
          {t("Salvestatud API-võtit ei saa selle Windowsi kasutaja all avada. Sisesta võti uuesti või eemalda see. Arved ja tarnijad on alles.")}
        </p>
      )}
      {provider === "groq" && (
        <p className="help">
          {t(
            "Groq: Qwen 3.8 loeb JPG/PNG pilte ja kuni 3-leheküljelisi PDF-e. PDF-i leheküljed teisendatakse selles arvutis piltideks. Tasuta kvoot sõltub kontost.",
          )}
        </p>
      )}
      {provider === "mistral" && (
        <p className="help">
          {t(
            "Mistral Document AI loeb PDF-i ja pilte OCR-mudeliga. Vali mistral-ocr mudel. Tasuta konto ei taga dokumendilugemise tasuta kvooti; kontrolli Mistrali konto kasutuspiire.",
          )}
        </p>
      )}
      <p className="help">
        {t(
          "Teenusepakkuja ja mudel on ühised kõigile ettevõtetele. Iga teenuse API-võti salvestatakse eraldi selles arvutis; võtit ei kuvata tagasi brauseris ega lisata maksefaili.",
        )}
      </p>
      <label className="field">
        <span>{t("AI teenusepakkuja")}</span>
        <select
          disabled={busy}
          value={provider}
          onChange={(e) => {
            const next = e.target.value as AIProviderId;
            setProvider(next);
            setModel(providers[next].model);
            setKey("");
            setModels(null);
            setMessage("");
          }}
        >
          {aiProviderIds.map((id) => (
            <option key={id} value={id}>
              {aiProviders[id].name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{t("Mudelite valik")}</span>
        <select
          disabled={busy}
          value={choices.some((m) => m.id === model) ? model : ""}
          onChange={(e) => {
            if (e.target.value) setModel(e.target.value);
          }}
        >
          <option value="">{t("Praegune või käsitsi sisestatud mudel")}</option>
          {choices.map((m) => (
            <option key={m.id} value={m.id}>
              {models === null ? t(m.name) : m.name} — {m.id}
            </option>
          ))}
        </select>
      </label>
      <p className="help">
        {models === null
          ? t(
              "Ametliku kataloogi mudelid (09.10.2026). Ligipääs sõltub sinu API-kontost. Võtmega laadimine asendab loendi kontole nähtavate mudelitega.",
            )
          : t(
              "API-kontole nähtavad mudelid. Vali mudel ja salvesta AI seaded.",
            )}
      </p>
      <label className="field">
        <span>{t("AI mudel")}</span>
        <input
          disabled={busy}
          value={model}
          onChange={(e) => setModel(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <p className="help">
        {t(
          "Vali laaditud loendist või sisesta PDF-i ja piltide lugemist toetava mudeli tunnus. Loend on filtreeritud mudeliperekonna järgi; konkreetse mudeli võimalused ja ligipääs sõltuvad teenusest.",
        )}
      </p>
      <label className="field">
        <span>
          {aiProviders[provider].name} {t("API-võti")}
        </span>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={key}
          disabled={busy}
          placeholder={
            configured
              ? t("Võti on salvestatud; muutmiseks sisesta uus")
              : t("Sisesta selle teenuse API-võti")
          }
          onChange={(e) => setKey(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="button secondary"
        disabled={busy || (!key.trim() && !configured)}
        onClick={() =>
          void perform(async () => {
            const next = await api<{ id: string; name: string }[]>(
              "ai-config/models",
              "POST",
              { provider, apiKey: key || undefined },
              companyId,
            );
            setModels(next);
            setMessage(
              "Võti töötab mudelite loendi jaoks. Vali mudel ja salvesta; arve lugemist see kontroll ei käivita.",
            );
          })
        }
      >
        {t("Kontrolli võtit ja laadi mudelid")}
      </button>
      <p className="help">
        {t(
          "Arvete lugemine kasutab valitud teenuse API-t ja võib olla tasuline. ChatGPT või Claude vestluse tellimus ei asenda selle ühenduse API-võtit.",
        )}
      </p>
      {provider !== initialProvider && (
        <p className="notice warning">
          {t(
            "Teenuse vahetamisel lülitatakse AI lugemine kõigis ettevõtetes välja. Luba allpool arveandmete saatmine uuele teenusele ja salvesta ettevõtte seaded.",
          )}
        </p>
      )}
      <div className="editor-actions">
        <button
          type="button"
          className="button primary"
          disabled={busy || !model.trim()}
          onClick={() =>
            void perform(async () => {
              await api(
                "ai-config",
                "PUT",
                { provider, model, apiKey: key || undefined },
                companyId,
              );
              setKey("");
              if (provider !== initialProvider) onProviderChanged();
              await refresh();
              notify(
                "AI seaded salvestatud. Uus valik kehtib järgmistele importidele.",
              );
            })
          }
        >
          {t("Salvesta AI seaded")}
        </button>
        {(configured || providers[provider].locked) && (
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  t("Eemaldan selle teenuse salvestatud API-võtme?"),
                )
              )
                void perform(async () => {
                  await api(
                    "ai-config",
                    "PUT",
                    { provider, model, removeKey: true },
                    companyId,
                  );
                  setKey("");
                  if (provider !== initialProvider) onProviderChanged();
                  await refresh();
                  notify("API-võti eemaldatud.");
                });
            }}
          >
            {t("Eemalda võti")}
          </button>
        )}
      </div>
      {message && (
        <p
          role={error ? "alert" : "status"}
          className={error ? "notice warning" : "notice success"}
        >
          {translateMessage(message)}
        </p>
      )}
    </section>
  );
}
