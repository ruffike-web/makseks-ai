"use client";
import { useLanguage } from "./language";
import { useState } from "react";
import {
  fieldLabels,
  invoiceFields,
  type InvoiceData,
  type InvoiceField,
} from "@/lib/domain";
import type { Approval, InvoiceView } from "@/lib/service";
import {
  IconX,
  IconDeviceFloppy,
  IconCheck,
  IconExternalLink,
} from "@tabler/icons-react";
import { euro } from "./api";
export type Preview = { url: string; mime: string; text?: string };
type Props = {
  invoice: InvoiceView;
  preview?: Preview;
  error?: string;
  busy: boolean;
  close: () => void;
  save: (d: InvoiceData) => Promise<void>;
  approve: (a: Approval) => Promise<void>;
  applySupplier: () => Promise<void>;
};
const mainFields: InvoiceField[] = [
  "supplierName",
  "supplierIban",
  "invoiceNumber",
  "amountDue",
  "currency",
  "dueDate",
  "referenceNumber",
  "customerNumber",
];
export function InvoiceEditor({
  invoice: i,
  preview,
  error,
  busy,
  close,
  save,
  approve,
  applySupplier,
}: Props) {
  const { t, message: translateMessage } = useLanguage();
  const [data, setData] = useState(i.data),
    [ack, setAck] = useState<Approval>({
      reviewed: false,
      duplicate: false,
      accountChange: false,
      rememberSupplier: false,
      reviewContext: i.reviewContext,
    });
  const dirty = JSON.stringify(data) !== JSON.stringify(i.data);
  function field(f: InvoiceField) {
    const provenance =
      JSON.stringify(data[f]) !== JSON.stringify(i.data[f])
        ? "user"
        : i.provenance[f];
    const confidence = i.data.confidence[f];
    return (
      <label
        className={`field ${f === "supplierName" || f === "supplierIban" ? "wide" : ""}`}
        key={f}
      >
        <span>
          {t(fieldLabels[f])}
          {[
            "supplierName",
            "supplierIban",
            "invoiceNumber",
            "amountDue",
            "currency",
          ].includes(f) && <b className="required"> *</b>}
        </span>
        <input
          disabled={busy}
          type={f === "dueDate" || f === "invoiceDate" ? "date" : "text"}
          inputMode={f === "amountDue" ? "decimal" : undefined}
          value={data[f] ?? ""}
          onChange={(e) => {
            setData({ ...data, [f]: e.target.value || null });
            setAck({ ...ack, reviewed: false });
          }}
          placeholder={
            f === "currency"
              ? "EUR"
              : f === "supplierCountryCode"
                ? t("Sisesta riigikood (nt EE)")
                : ""
          }
        />
        {provenance && (
          <small>
            {provenance === "supplier"
              ? t("Tarnijaregistrist")
              : provenance === "user"
                ? t("Käsitsi sisestatud")
                : t("Arvelt loetud")}
            {provenance === "invoice" && confidence !== undefined
              ? t(" · kindlus {percent}%", {
                  percent: Math.round(confidence * 100),
                })
              : ""}
          </small>
        )}
        {provenance === "supplier" && i.originalData[f] !== data[f] && (
          <small>
            {t("Arvelt loetud:")} {i.originalData[f] || t("puudus")}
          </small>
        )}
      </label>
    );
  }
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !dirty) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
        className="editor"
      >
        <header className="editor-heading">
          <div>
            <p className="eyebrow">{t("ARVE KONTROLL")}</p>
            <h2 id="editor-title">{i.sourceFileName}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={t("Sulge arve")}
            onClick={() => {
              if (
                !dirty ||
                window.confirm(
                  t("Salvestamata muudatused lähevad kaotsi. Sulgen arve?"),
                )
              )
                close();
            }}
          >
            <IconX />
          </button>
        </header>
        <div className="editor-body">
          <aside className="document-preview">
            <div className="preview-toolbar">
              <strong>{t("Algdokument")}</strong>
              {preview && (
                <a href={preview.url} target="_blank" rel="noreferrer">
                  {t("Ava eraldi")} <IconExternalLink size={14} />
                </a>
              )}
            </div>
            {preview?.mime.startsWith("image/") ? (
              <div className="image-preview">
                {/* Local user-supplied object URL, never a remote image. */}
                <img src={preview.url} alt={t("Üleslaaditud ostuarve")} />
              </div>
            ) : preview?.mime === "application/pdf" ? (
              <iframe title={t("Algne ostuarve")} src={preview.url} />
            ) : (
              <div className="preview-empty">
                <p>{t("Algdokumendi eelvaade pole saadaval.")}</p>
                <p>
                  {t(
                    "Üleslaaditud faili eelvaade säilib selle brauserilehe sulgemiseni. Kontrolli andmeid oma originaalarvelt.",
                  )}
                </p>
              </div>
            )}
            {preview?.text && (
              <details>
                <summary>{t("PDF-ist loetud tekst")}</summary>
                <pre>{preview.text}</pre>
              </details>
            )}
          </aside>
          <div className="editor-form">
            {error && (
              <div role="alert" className="notification error">
                {translateMessage(error)}
              </div>
            )}
            <div className="form-grid">{mainFields.map(field)}</div>
            {i.accountCandidates.length > 1 && (
              <label className="field">
                <span>{t("Tarnija pangakontod")}</span>
                <select disabled={busy} value={i.accountCandidates.includes(data.supplierIban ?? "") ? data.supplierIban! : ""} onChange={(event) => {
                  if (!event.target.value) return;
                  setData({ ...data, supplierIban: event.target.value, supplierBic: null });
                  setAck({ ...ack, reviewed: false });
                }}>
                  <option value="">{t("Vali saaja konto")}</option>
                  {i.accountCandidates.map((iban) => <option key={iban} value={iban}>{iban}</option>)}
                </select>
                <small>{t("Arvelt või tarnijaregistrist leiti mitu kontot. Vali õige konto ja salvesta muudatused; valik ei kinnita arvet automaatselt.")}</small>
              </label>
            )}
            <details className="extra-fields">
              <summary>{t("Lisaandmed ja saaja aadress")}</summary>
              <p className="help">
                {t(
                  "Siin on tarnija ehk makse saaja aadress. Seadetes olev aadress kuulub maksjale. Riigikood tuleb sisestada; näidistekst ei ole salvestatud väärtus.",
                )}
              </p>
              <div className="form-grid">
                {invoiceFields
                  .filter((f) => !mainFields.includes(f))
                  .map(field)}
              </div>
            </details>
            {i.supplier && (
              <button
                type="button"
                className="button subtle"
                disabled={busy || dirty}
                onClick={() => void applySupplier()}
              >
                {t("Kasuta salvestatud tarnijaandmeid")}
              </button>
            )}
            <div className="payment-result">
              <span>{t("Makse kuupäev")}</span>
              <strong>{i.executionDate ?? t("Vajab määramist")}</strong>
              <span>{t("Selgitus")}</span>
              <strong>{i.description}</strong>
            </div>
            {i.extractionNote && (
              <p className="notice">{translateMessage(i.extractionNote)}</p>
            )}
            {i.issues.filter((x) => x.code !== "APPROVAL").length > 0 && (
              <ul className="issue-list">
                {i.issues
                  .filter((x) => x.code !== "APPROVAL")
                  .map((issue, index) => (
                    <li className={issue.severity} key={index}>
                      {translateMessage(issue.message)}
                    </li>
                  ))}
              </ul>
            )}
            {(i.duplicate || i.exportedAt) && (
              <label className="check warning">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={ack.duplicate}
                  onChange={(e) =>
                    setAck({ ...ack, duplicate: e.target.checked })
                  }
                />
                <span>
                  {t(
                    "Kontrollisin võimalikku duplikaati või varasemat eksporti. Selle arve lisamine on tahtlik.",
                  )}
                </span>
              </label>
            )}
            {i.accountChanged && (
              <label className="check warning">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={ack.accountChange}
                  onChange={(e) =>
                    setAck({ ...ack, accountChange: e.target.checked })
                  }
                />
                <span>
                  {t(
                    "Kontrollisin tarnija muutunud pangakonto õigsust sõltumatult.",
                  )}
                </span>
              </label>
            )}
            <label className="check">
              <input
                type="checkbox"
                disabled={busy}
                checked={ack.rememberSupplier}
                onChange={(e) =>
                  setAck({ ...ack, rememberSupplier: e.target.checked })
                }
              />
              <span>
                {t(
                  "Jäta tarnija andmed ja see konto kinnitatud tarnijaregistrisse meelde.",
                )}
              </span>
            </label>
            <label className="check approval">
              <input
                type="checkbox"
                checked={ack.reviewed}
                disabled={dirty || busy}
                onChange={(e) => setAck({ ...ack, reviewed: e.target.checked })}
              />
              <span>
                {t(
                  "Kontrollisin algdokumendilt saajat, IBAN-i, summat, kuupäeva ja makse selgitust.",
                )}
              </span>
            </label>
            {dirty && (
              <p className="help">
                {t(
                  "Salvesta muudatused, et uuendada kontrolli tulemusi ja arve kinnitada.",
                )}
              </p>
            )}
            <div className="editor-actions">
              <button
                className="button secondary"
                disabled={busy || !dirty}
                onClick={() => void save(data)}
              >
                <IconDeviceFloppy size={18} />
                {t("Salvesta muudatused")}
              </button>
              <button
                className="button primary"
                disabled={busy || dirty || !ack.reviewed}
                onClick={() => void approve(ack)}
              >
                <IconCheck size={18} />
                {t("Kinnita arve")}
              </button>
            </div>
            <p className="help">
              {i.data.amountDue ? `${euro(i.data.amountDue)} · ` : ""}
              {t("Kinnitus ei algata makset.")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
