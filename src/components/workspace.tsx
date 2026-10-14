"use client";
import { useLanguage } from "./language";
import Link from "next/link";
import { bankOptions, bankProfiles } from "@/lib/bank-profiles";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconArrowRight,
  IconCheck,
  IconChecks,
  IconCloudUpload,
  IconDownload,
  IconFileInvoice,
  IconFileTypeXml,
  IconFolder,
  IconLoader2,
  IconPlus,
  IconSearch,
  IconSettings,
  IconShieldCheck,
  IconTrash,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import {
  formatCents,
  parseCents,
  statusLabels,
  type Settings,
  type Status,
} from "@/lib/domain";
import type { AppState, InvoiceView } from "@/lib/service";
import type { XmlValidation } from "@/lib/banks";
import { api as requestApi, euro } from "./api";
import type { Company } from "./companies";
import { SettingsView } from "./settings";
import { InvoiceEditor, type Preview } from "./invoice-editor";
import { SupplierEditor } from "./supplier-editor";
import type { SupplierData } from "@/lib/suppliers";
type View = "import" | "review" | "export" | "suppliers" | "settings";
const navigation = [
  { id: "import", label: "Arvete import", icon: IconCloudUpload },
  { id: "review", label: "Arvete kontroll", icon: IconChecks },
  { id: "export", label: "Maksefail", icon: IconFileTypeXml },
  { id: "suppliers", label: "Tarnijad", icon: IconUsers },
  { id: "settings", label: "Seaded", icon: IconSettings },
] as const;
const headings: Record<View, { title: string; description: string }> = {
  import: {
    title: "Arvest maksefailini.",
    description:
      "Lisa ostuarved, kontrolli andmed ja valmista maksed pangale ette.",
  },
  review: {
    title: "Arvete kontroll",
    description:
      "Vaata makseandmed algdokumendilt üle. Sina annad lõpliku kinnituse.",
  },
  export: {
    title: "Maksefail",
    description:
      "Vali kinnitatud arved ja laadi maksefail internetipanka importimiseks alla.",
  },
  suppliers: {
    title: "Tarnijad",
    description:
      "Sinu kinnitatud andmed aitavad märgata muutunud pangakontosid.",
  },
  settings: {
    title: "Seaded",
    description: "Maksja andmed, maksekuupäevad ja arvete automaatne lugemine.",
  },
};
function Badge({ status }: { status: Status }) {
  const { t } = useLanguage();
  return (
    <span className={`badge ${status.toLowerCase()}`}>
      <span />
      {t(statusLabels[status])}
    </span>
  );
}
export function CompanyWorkspace({
  companyId,
  companies,
  switchCompany,
  createCompany,
  reloadCompanies,
}: {
  companyId: string;
  companies: Company[];
  switchCompany: (id: string) => void;
  createCompany: (name: string) => Promise<void>;
  reloadCompanies: () => Promise<void>;
}) {
  const { t, message: translateMessage } = useLanguage();
  const api = useCallback(
    function scopedApi<T = unknown>(
      path: string,
      method = "GET",
      body?: unknown,
    ) {
      return requestApi<T>(path, method, body, companyId);
    },
    [companyId],
  );
  const [addingCompany, setAddingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  function mayLeaveCompany() {
    return (
      !(editing || editingSupplier || view === "settings") ||
      window.confirm(
        t(
          "Ettevõtte vahetamisel sulgub praegune vaade ja salvestamata muudatused lähevad kaotsi. Jätkan?",
        ),
      )
    );
  }
  const [state, setState] = useState<AppState | null>(null),
    [view, setView] = useState<View>("import"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState<{
      text: string;
      error: boolean;
      uploads?: { count: number; errors: { name: string; error: string }[] };
    } | null>(null),
    [editing, setEditing] = useState<string | null>(null),
    [editingSupplier, setEditingSupplier] = useState<SupplierData | null>(null),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState<"all" | Status>("all"),
    [selected, setSelected] = useState<string[]>([]),
    [dragging, setDragging] = useState(false),
    [progress, setProgress] = useState(""),
    [readingMode, setReadingMode] = useState<"local" | "manual" | "ai">("local"),
    [download, setDownload] = useState<{
      url: string;
      filename: string;
      validation: XmlValidation;
    } | null>(null);
  const previews = useRef<Record<string, Preview>>({}),
    fileInput = useRef<HTMLInputElement>(null),
    downloadRef = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    const next = await api<AppState>("state");
    setState(next);
    setSelected(
      next.invoices.filter((i) => i.status === "READY").map((i) => i.id),
    );
    return next;
  }, [api]);
  useEffect(() => {
    const previewCache = previews.current;
    void refresh().catch((e) => setMessage({ text: e.message, error: true }));
    return () => {
      Object.values(previewCache).forEach((p) => URL.revokeObjectURL(p.url));
      if (downloadRef.current) URL.revokeObjectURL(downloadRef.current);
    };
  }, [refresh]);
  async function perform(action: () => Promise<void>, success?: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await refresh();
      if (success) setMessage({ text: success, error: false });
    } catch (e) {
      setMessage({
        text: e instanceof Error ? e.message : "Toiming ebaõnnestus.",
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }
  async function manual() {
    await perform(async () => {
      const row = await api<{ id: string }>("invoices", "POST", {});
      setEditing(row.id);
      setView("review");
    });
  }
  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length || busy) return;
    if (list.length > 50) {
      setMessage({ text: "Lisa korraga kuni 50 arvet.", error: true });
      return;
    }
    setBusy(true);
    setMessage(null);
    const errors: { name: string; error: string }[] = [];
    let success = 0;
    for (let n = 0; n < list.length; n++) {
      const file = list[n];
      setProgress(`${n + 1} / ${list.length} · ${file.name}`);
      try {
        const body = new FormData();
        body.append("file", file);
        body.append("mode", readingMode);
        const r = await api<{ id: string; nativeText?: string }>(
          "upload",
          "POST",
          body,
        );
        previews.current[r.id] = {
          url: URL.createObjectURL(file),
          mime: file.type,
          text: r.nativeText,
        };
        success++;
      } catch (e) {
        errors.push({
          name: file.name,
          error: e instanceof Error ? e.message : "Import ebaõnnestus",
        });
      }
    }
    try {
      await refresh();
      setMessage({
        text: [
          success
            ? `${success} arvet lisatud. Kontrolli ja kinnita makseandmed.`
            : "",
          ...errors.map((item) => `${item.name}: ${item.error}`),
        ]
          .filter(Boolean)
          .join(" "),
        error: errors.length > 0,
        uploads: { count: success, errors },
      });
      if (success) setView("review");
    } catch {
      setMessage({
        text: "Vaate värskendamine ebaõnnestus. Laadi leht uuesti.",
        error: true,
      });
    } finally {
      setBusy(false);
      setProgress("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function exportFile() {
    await perform(async () => {
      const result = await api<{
        xml: string;
        filename: string;
        validation: XmlValidation;
      }>("export", "POST", { ids: selected });
      if (downloadRef.current) URL.revokeObjectURL(downloadRef.current);
      const url = URL.createObjectURL(
        new Blob([result.xml], { type: "application/xml;charset=utf-8" }),
      );
      downloadRef.current = url;
      setDownload({
        url,
        filename: result.filename,
        validation: result.validation,
      });
    }, "Maksefail on valmis. Laadi see alla ja impordi internetipanka.");
  }
  const current = state?.invoices.find((i) => i.id === editing),
    ready = state?.invoices.filter((i) => i.status === "READY") ?? [];
  const filtered =
    state?.invoices.filter(
      (i) =>
        (filter === "all" ||
          i.status === filter ||
          (filter === "READY" && i.status === "EXPORTED")) &&
        `${i.data.supplierName} ${i.data.invoiceNumber} ${i.sourceFileName}`
          .toLocaleLowerCase("et")
          .includes(query.toLocaleLowerCase("et")),
    ) ?? [];
  const total = (items: InvoiceView[]) =>
    formatCents(
      items.reduce((sum, i) => sum + (parseCents(i.data.amountDue) ?? 0n), 0n),
    );
  const selectedItems = ready.filter((i) => selected.includes(i.id));
  const stats = state
    ? [
        { label: "Arveid kokku", value: String(state.invoices.length) },
        { label: "Valmis makseid", value: String(ready.length) },
        {
          label: "Vajab kontrolli",
          value: String(
            state.invoices.filter((i) => i.status === "REVIEW_REQUIRED").length,
          ),
        },
        {
          label: "Vigaseid arveid",
          value: String(
            state.invoices.filter((i) => i.status === "INVALID").length,
          ),
        },
      ]
    : [];
  function table(items: InvoiceView[], selectable = false) {
    return (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {selectable && (
                <th>
                  <input
                    type="checkbox"
                    aria-label={t("Vali kõik valmis maksed")}
                    checked={
                      items.length > 0 &&
                      items.every((i) => selected.includes(i.id))
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? items.map((i) => i.id) : [],
                      )
                    }
                  />
                </th>
              )}
              <th>{t("Tarnija / arve")}</th>
              <th>{t("Staatus")}</th>
              <th>{t("Maksetähtpäev")}</th>
              <th>{t("Makse kuupäev")}</th>
              <th className="align-right">{t("Summa")}</th>
              <th>
                <span className="sr-only">{t("Tegevused")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                {selectable && (
                  <td>
                    <input
                      type="checkbox"
                      aria-label={t("Vali arve {number}", {
                        number: i.data.invoiceNumber ?? "",
                      })}
                      checked={selected.includes(i.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, i.id]
                            : selected.filter((id) => id !== i.id),
                        )
                      }
                    />
                  </td>
                )}
                <td>
                  <button
                    className="table-name"
                    onClick={() => setEditing(i.id)}
                  >
                    {i.data.supplierName || t("Tarnija määramata")}
                  </button>
                  <small>
                    {i.data.invoiceNumber || i.sourceFileName}
                    {i.exportedAt ? t(" · varem eksporditud") : ""}
                  </small>
                </td>
                <td>
                  <Badge status={i.status} />
                </td>
                <td>{i.data.dueDate || "—"}</td>
                <td>{i.executionDate || "—"}</td>
                <td className="align-right amount">
                  {i.data.amountDue ? euro(i.data.amountDue) : "—"}
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="text-button"
                      onClick={() => setEditing(i.id)}
                    >
                      {t("Kontrolli")} <IconArrowRight size={15} />
                    </button>
                    <button
                      className="icon-button muted"
                      aria-label={t("Kustuta arve {number}", {
                        number: i.data.invoiceNumber || i.sourceFileName,
                      })}
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            t("Kustutan selle arve kohalikust registrist?"),
                          )
                        )
                          void perform(async () => {
                            await api(`invoices/${i.id}`, "DELETE");
                            if (previews.current[i.id]) {
                              URL.revokeObjectURL(previews.current[i.id].url);
                              delete previews.current[i.id];
                            }
                          });
                      }}
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label={t("Makseks AI avaleht")}>
          <span className="brand-mark">
            <IconFileInvoice size={25} />
          </span>
          <span>
            Makseks<span className="brand-light">AI</span>
          </span>
        </Link>
        <p className="workspace-label">{t("MAKSETE TÖÖLAUD")}</p>
        <nav aria-label={t("Põhinavigatsioon")}>
          {navigation.map((n) => (
            <button
              key={n.id}
              aria-label={t(n.label)}
              className={view === n.id ? "nav-item active" : "nav-item"}
              onClick={() => {
                setView(n.id);
                setMessage(null);
              }}
            >
              <n.icon size={20} stroke={1.7} />
              <span>{t(n.label)}</span>
              {n.id === "review" && state?.invoices.length ? (
                <span className="nav-count">{state.invoices.length}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <IconShieldCheck size={23} />
          <strong>{t("Sinu kontrolli all")}</strong>
          <p>{t("Makseid kinnitad ise internetipangas.")}</p>
          <span className="local-label">{t("Kohalik tööruum")}</span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            {t("Töölaud")} <span>/</span>{" "}
            {t(navigation.find((n) => n.id === view)?.label ?? "")}
          </span>
          <div className="company-controls">
            <label className="company-choice">
              <span>{t("Ettevõte")}</span>
              <select
                aria-label={t("Aktiivne ettevõte")}
                value={companyId}
                disabled={busy}
                onChange={(e) => {
                  if (mayLeaveCompany()) switchCompany(e.target.value);
                }}
              >
                {companies.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button secondary small"
              disabled={busy}
              onClick={() => {
                if (mayLeaveCompany()) {
                  setMessage(null);
                  setAddingCompany(true);
                }
              }}
            >
              <IconPlus size={16} />
              {t("Lisa ettevõte")}
            </button>
            <button
              className="icon-button"
              aria-label={t("Ettevõtte seaded")}
              onClick={() => setView("settings")}
            >
              <IconSettings size={18} />
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">{t("OSTUARVED → PANGAMAKSED")}</p>
              <h1>{t(headings[view].title)}</h1>
              <p>{t(headings[view].description)}</p>
            </div>
            {view === "review" && (
              <button
                className="button primary"
                onClick={() => setView("export")}
                disabled={!ready.length}
              >
                {t("Maksefaili juurde")} <IconArrowRight size={18} />
              </button>
            )}
          </div>
          {message && (
            <div
              role={message.error ? "alert" : "status"}
              className={`notification ${message.error ? "error" : "success"}`}
            >
              <span>
                {message.uploads ? (
                  <>
                    {message.uploads.count > 0 &&
                      t(
                        "{count} arvet lisatud. Kontrolli ja kinnita makseandmed.",
                        { count: message.uploads.count },
                      )}
                    {message.uploads.errors.map((item, index) => (
                      <span key={index}>
                        {" "}
                        {item.name}: {translateMessage(item.error)}
                      </span>
                    ))}
                  </>
                ) : (
                  translateMessage(message.text)
                )}
              </span>
              <button
                aria-label={t("Sulge teade")}
                className="icon-button"
                onClick={() => setMessage(null)}
              >
                <IconX size={18} />
              </button>
            </div>
          )}
          {!state ? (
            <div className="loading">
              <IconLoader2 className="spin" />
              {t("Laadin töölauda…")}
              {message?.error && (
                <button
                  className="button secondary"
                  onClick={() =>
                    void perform(async () => {
                      await refresh();
                    })
                  }
                >
                  {t("Proovi uuesti")}
                </button>
              )}
            </div>
          ) : (
            <>
              {(view === "import" || view === "review") && (
                <div className="stats">
                  {stats.map((s, index) => (
                    <div key={s.label}>
                      <span>{t(s.label)}</span>
                      <strong className={index === 1 ? "green" : ""}>
                        {s.value}
                      </strong>
                    </div>
                  ))}
                  <div className="total-stat">
                    <span>{t("Valmis maksete summa")}</span>
                    <strong>{euro(total(ready))}</strong>
                  </div>
                </div>
              )}
              {view === "import" && (
                <>
                  <div className="import-layout">
                    <section className="panel upload-panel">
                      <div className="section-title">
                        <h2>{t("Lisa ostuarved")}</h2>
                        <span className="step-chip">{t("1. samm")}</span>
                      </div>
                      <label className="field">
                        <span>{t("Andmete lugemine")}</span>
                        <select value={readingMode} disabled={busy} onChange={(event) => setReadingMode(event.target.value as "local" | "manual" | "ai")}>
                          <option value="local">{t("Kohalik lugemine — ilma AI-teenuseta")}</option>
                          <option value="ai" disabled={!state.aiConfigured || !state.settings.aiEnabled || state.settings.aiConsentProvider !== state.aiProvider}>{t("AI lugemine")}</option>
                          <option value="manual">{t("Käsitsi sisestamine")}</option>
                        </select>
                      </label>
                      <p className="help">{t(readingMode === "local" ? "Loeb tekstiga PDF-i selles arvutis. Võtit ega internetti pole vaja. Pildid ja skannid tuleb täita käsitsi; kontrolli alati leitud andmeid." : readingMode === "ai" ? "Arve saadetakse seadetes valitud AI-teenusele." : "Fail jääb võrdluseks; makseandmed sisestad ise.")}</p>
                      <input
                        ref={fileInput}
                        className="sr-only"
                        id="invoice-files"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        multiple
                        onChange={(e) => {
                          if (e.target.files) void upload(e.target.files);
                        }}
                        disabled={busy}
                      />
                      <div
                        className={`dropzone ${dragging ? "dragging" : ""}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragging(false);
                          void upload(e.dataTransfer.files);
                        }}
                      >
                        <div className="upload-icon">
                          {busy ? (
                            <IconLoader2 className="spin" size={32} />
                          ) : (
                            <IconCloudUpload size={32} stroke={1.5} />
                          )}
                        </div>
                        <h3>
                          {busy
                            ? t("Töötlen arveid…")
                            : t("Lohista arved siia")}
                        </h3>
                        <p>
                          {busy ? progress : t("või vali failid oma arvutist")}
                        </p>
                        <button
                          className="button primary"
                          disabled={busy}
                          onClick={() => fileInput.current?.click()}
                        >
                          <IconPlus size={17} />
                          {t("Vali arvefailid")}
                        </button>
                        <small>
                          {t("PDF, JPG või PNG · vaikimisi kuni 10 MB / fail")}
                        </small>
                      </div>
                      <div className="upload-footer">
                        <span>{t("Arve pole failina?")}</span>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => void manual()}
                        >
                          {t("Lisa käsitsi")} <IconArrowRight size={16} />
                        </button>
                      </div>
                    </section>
                    <aside className="how-it-works">
                      <p className="eyebrow">{t("KOLM LIHTSAT SAMMU")}</p>
                      <h2>
                        {t("Ülevaade enne")}
                        <br />
                        {t("iga makset.")}
                      </h2>
                      <ol>
                        <li>
                          <span>1</span>
                          <div>
                            <strong>{t("Lisa arved")}</strong>
                            <p>
                              {t("Laadi üles üks arve või terve kaustatäis.")}
                            </p>
                          </div>
                        </li>
                        <li>
                          <span>2</span>
                          <div>
                            <strong>{t("Kontrolli andmeid")}</strong>
                            <p>
                              {t(
                                "Vaata üle saaja, pangakonto, summa ja kuupäev.",
                              )}
                            </p>
                          </div>
                        </li>
                        <li>
                          <span>3</span>
                          <div>
                            <strong>{t("Laadi maksefail alla")}</strong>
                            <p>
                              {t("Impordi XML valitud panga internetipanka.")}
                            </p>
                          </div>
                        </li>
                      </ol>
                      <div className="privacy-note">
                        <IconShieldCheck size={20} />
                        <p>{t("Ükski makse ei liigu sinu kinnituseta.")}</p>
                      </div>
                    </aside>
                  </div>
                  {(!state.aiConfigured || !state.settings.aiEnabled) && (
                    <div className="inline-note">
                      <IconFileInvoice size={20} />
                      <p>
                        {t("Kohalik lugemine on kasutusvalmis. AI lugemise saad lubada seadetes.")}
                      </p>
                      <button
                        className="text-button"
                        onClick={() => setView("settings")}
                      >
                        {t("Ava seaded")} <IconArrowRight size={15} />
                      </button>
                    </div>
                  )}
                  <section className="panel recent-panel">
                    <div className="section-title">
                      <h2>{t("Viimati lisatud arved")}</h2>
                      {state.invoices.length > 0 && (
                        <button
                          className="text-button"
                          onClick={() => setView("review")}
                        >
                          {t("Vaata kõiki")} <IconArrowRight size={16} />
                        </button>
                      )}
                    </div>
                    {state.invoices.length ? (
                      table(state.invoices.slice(0, 5))
                    ) : (
                      <div className="empty-row">
                        <IconFolder size={30} stroke={1.4} />
                        <div>
                          <strong>
                            {t("Sinu esimene arve ootab lisamist")}
                          </strong>
                          <p>
                            {t(
                              "Lisatud arved ja nende kontrolli tulemused ilmuvad siia.",
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}
              {view === "review" && (
                <section className="panel">
                  <div className="table-toolbar">
                    <div className="filter-tabs">
                      {(
                        ["all", "REVIEW_REQUIRED", "READY", "INVALID"] as const
                      ).map((f) => (
                        <button
                          className={filter === f ? "active" : ""}
                          key={f}
                          onClick={() => setFilter(f)}
                        >
                          {f === "all"
                            ? t("Kõik arved")
                            : f === "READY"
                              ? t("Valmis arved")
                              : t(statusLabels[f])}
                        </button>
                      ))}
                    </div>
                    <label className="search">
                      <IconSearch size={17} />
                      <input
                        aria-label={t("Otsi arveid")}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t("Otsi tarnijat või arvet")}
                      />
                    </label>
                    <button
                      className="button secondary small"
                      disabled={busy}
                      onClick={() => void manual()}
                    >
                      <IconPlus size={15} />
                      {t("Lisa arve")}
                    </button>
                  </div>
                  {filtered.length ? (
                    table(filtered)
                  ) : (
                    <div className="empty-state">
                      <IconChecks size={38} stroke={1.4} />
                      <h3>{t("Siin pole veel arveid")}</h3>
                      <p>{t("Lisa uus arve või muuda otsingut ja filtrit.")}</p>
                      <button
                        className="button secondary"
                        onClick={() => setView("import")}
                      >
                        {t("Lisa ostuarved")}
                      </button>
                    </div>
                  )}
                </section>
              )}
              {view === "export" && (
                <>
                  <div className="export-layout">
                    <section className="panel">
                      <div className="section-title">
                        <h2>{t("Ekspordiks valmis")}</h2>
                        <span className="muted">
                          {ready.length} {t("makset")}
                        </span>
                      </div>
                      {ready.length ? (
                        table(ready, true)
                      ) : (
                        <div className="empty-state">
                          <IconFileTypeXml size={40} stroke={1.3} />
                          <h3>{t("Kinnita kõigepealt arved")}</h3>
                          <p>
                            {t(
                              "Siia ilmuvad ainult kontrollitud ja kinnitatud maksed.",
                            )}
                          </p>
                          <button
                            className="button secondary"
                            onClick={() => setView("review")}
                          >
                            {t("Kontrolli makseid")}
                          </button>
                        </div>
                      )}
                    </section>
                    <aside className="panel export-summary">
                      <p className="eyebrow">{t("MAKSEFAILI KOKKUVÕTE")}</p>
                      <h2>
                        {state.settings.preferredBank} {t("maksed")}
                      </h2>
                      <dl>
                        <dt>{t("Valitud arveid")}</dt>
                        <dd>{selectedItems.length}</dd>
                        <dt>{t("Maksekuupäevi")}</dt>
                        <dd>
                          {
                            new Set(selectedItems.map((i) => i.executionDate))
                              .size
                          }
                        </dd>
                        <dt>{t("Maksja")}</dt>
                        <dd>{state.settings.companyName || t("Määramata")}</dd>
                      </dl>
                      <div className="export-total">
                        <span>{t("Kokku")}</span>
                        <strong>{euro(total(selectedItems))}</strong>
                      </div>
                      {state.payerIssues.length > 0 && (
                        <div className="notice warning">
                          <p>
                            {translateMessage(state.payerIssues[0].message)}
                          </p>
                          <button
                            className="text-button"
                            onClick={() => setView("settings")}
                          >
                            {t("Ava seaded")}
                          </button>
                        </div>
                      )}
                      <button
                        className="button primary"
                        disabled={
                          busy ||
                          !selectedItems.length ||
                          state.payerIssues.length > 0
                        }
                        onClick={() => void exportFile()}
                      >
                        {busy ? (
                          <IconLoader2 className="spin" size={18} />
                        ) : (
                          <IconFileTypeXml size={18} />
                        )}
                        {t("Genereeri maksefail")}
                      </button>
                      <p className="help">
                        {t(
                          "Iga maksekuupäev saab failis oma maksegrupi. Makse kinnitad internetipangas.",
                        )}
                      </p>
                    </aside>
                  </div>
                  {download && (
                    <div className="download-panel">
                      <IconCheck size={30} />
                      <div>
                        <h2>{t("Maksefail on valmis")}</h2>
                        <p>{download.filename}</p>
                        <p className="help">
                          {translateMessage(download.validation.message)}
                        </p>
                      </div>
                      <a
                        className="button primary"
                        href={download.url}
                        download={download.filename}
                      >
                        <IconDownload size={18} />
                        {t("Laadi XML alla")}
                      </a>
                    </div>
                  )}
                  <p className="bank-note">
                    {translateMessage(
                      bankProfiles[state.settings.preferredBank].importNote,
                    )}
                  </p>
                </>
              )}
              {view === "suppliers" && (
                <section className="panel">
                  {state.suppliers.length ? (
                    <div className="supplier-list">
                      {state.suppliers.map((s) => (
                        <div className="supplier-row" key={s.id}>
                          <div className="supplier-avatar">
                            <IconUsers size={23} />
                          </div>
                          <div>
                            <h3>{s.name}</h3>
                            <p>
                              {s.registrationCode || t("Registrikood puudub")}
                              {s.town ? ` · ${s.town}` : ""}
                            </p>
                          </div>
                          <div className="trusted-accounts">
                            <span>{t("Kinnitatud kontod")}</span>
                            {s.trustedIbans.map((iban) => (
                              <code key={iban}>{iban}</code>
                            ))}
                          </div>
                          <button
                            className="button secondary small"
                            disabled={busy}
                            onClick={() => {
                              setMessage(null);
                              setEditingSupplier(s);
                            }}
                          >
                            {t("Muuda tarnijat")}
                          </button>
                          <button
                            className="icon-button"
                            aria-label={t("Unusta tarnija {name}", {
                              name: s.name,
                            })}
                            disabled={busy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  t(
                                    "Eemaldan tarnija meelde jäetud andmed? Arved jäävad alles.",
                                  ),
                                )
                              )
                                void perform(async () => {
                                  await api(`suppliers/${s.id}`, "DELETE");
                                });
                            }}
                          >
                            <IconTrash size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <IconUsers size={40} stroke={1.3} />
                      <h3>{t("Kinnitatud tarnijad ilmuvad siia")}</h3>
                      <p>
                        {t(
                          "Arve kinnitamisel saad tarnija andmed meelde jätta.",
                        )}
                        <br />
                        {t("Uue pangakonto korral küsime eraldi kinnitust.")}
                      </p>
                      <button
                        className="button secondary"
                        onClick={() => setView("review")}
                      >
                        {t("Arvete juurde")}
                      </button>
                    </div>
                  )}
                </section>
              )}
              {view === "settings" && (
                <SettingsView
                  notify={(text) =>
                    setMessage(text ? { text, error: false } : null)
                  }
                  refresh={refresh}
                  key={JSON.stringify(state.settings)}
                  state={state}
                  busy={busy}
                  save={async (s: Settings) => {
                    await perform(async () => {
                      await api("settings", "PUT", s);
                      await reloadCompanies();
                    }, "Seaded on salvestatud.");
                  }}
                />
              )}
            </>
          )}
          <footer className="page-footer">
            <span>Makseks AI</span>
            <span>
              {bankOptions.map((bank) => bank.displayName).join(" & ")}{" "}
              {t("· EUR maksed")}
            </span>
          </footer>
        </main>
      </div>
      {current && (
        <InvoiceEditor
          key={`${current.id}-${current.version}`}
          invoice={current}
          error={message?.error ? message.text : undefined}
          preview={previews.current[current.id]}
          busy={busy}
          close={() => setEditing(null)}
          save={async (data) => {
            await perform(async () => {
              await api(`invoices/${current.id}`, "PUT", {
                version: current.version,
                data,
              });
            }, "Muudatused salvestatud. Kontrolli tulemused üle ja kinnita arve.");
          }}
          approve={async (ack) => {
            await perform(async () => {
              await api(`invoices/${current.id}/approve`, "POST", {
                version: current.version,
                ...ack,
              });
              setEditing(null);
            }, "Arve on kinnitatud ja maksefailiks valmis.");
          }}
          applySupplier={async () => {
            await perform(async () => {
              await api(`invoices/${current.id}/supplier`, "POST", {
                version: current.version,
              });
            });
          }}
        />
      )}
      {addingCompany && (
        <div className="modal-backdrop">
          <section
            className="editor"
            style={{ maxWidth: 520 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-company-title"
          >
            <header className="editor-heading">
              <h2 id="new-company-title">{t("Lisa ettevõte")}</h2>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setAddingCompany(false)}
              >
                {t("Sulge")}
              </button>
            </header>
            <form
              className="editor-form"
              onSubmit={(e) => {
                e.preventDefault();
                setBusy(true);
                setMessage(null);
                void createCompany(newCompanyName)
                  .catch((e) => setMessage({ text: e.message, error: true }))
                  .finally(() => setBusy(false));
              }}
            >
              {message?.error && (
                <p role="alert" className="notification error">
                  {translateMessage(message.text)}
                </p>
              )}
              <label className="field">
                <span>{t("Uue ettevõtte nimi")}</span>
                <input
                  autoFocus
                  required
                  maxLength={140}
                  disabled={busy}
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                />
              </label>
              <p className="help">
                {t(
                  "Uuele ettevõttele luuakse eraldi arved, tarnijad ja makseajalugu. Maksja konto ning muud andmed saad sisestada Seadetes.",
                )}
              </p>
              <button
                className="button primary"
                disabled={busy || !newCompanyName.trim()}
              >
                {t("Loo ettevõte")}
              </button>
            </form>
          </section>
        </div>
      )}
      {editingSupplier && (
        <SupplierEditor
          supplier={editingSupplier}
          busy={busy}
          error={message?.error ? message.text : undefined}
          close={() => setEditingSupplier(null)}
          save={async (data) => {
            await perform(async () => {
              await api(`suppliers/${data.id}`, "PUT", data);
              setEditingSupplier(null);
            }, "Tarnija andmed salvestatud. Järgmistel importidel kasutatakse parandatud andmeid.");
          }}
        />
      )}
    </div>
  );
}
