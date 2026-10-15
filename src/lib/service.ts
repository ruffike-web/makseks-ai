import { createHash, randomUUID } from "node:crypto";
import {
  PrismaClient,
  type Prisma,
  type Invoice,
} from "../generated/prisma/client";
import { bankAdapters } from "./banks";
import { aiStatus } from "./ai-config";
import {
  matchSupplier,
  supplierIdentityConflict,
  supplierSchema,
  supplierValues,
  type SupplierData,
} from "./suppliers";
export type { SupplierData } from "./suppliers";
import {
  defaultSettings,
  effectiveDate,
  estoniaToday,
  evaluateInvoice,
  formatCents,
  invoiceFields,
  invoiceIdentity,
  invoiceSchema,
  normalizedName,
  normalizeInvoice,
  parseCents,
  settingsSchema,
  toPayment,
  validatePayer,
  type InvoiceData,
  type Settings,
} from "./domain";
type Store = Prisma.TransactionClient;
type Fingerprint = {
  invoiceId: string;
  hash: string | null;
  identity: string | null;
};
export type Approval = {
  reviewed: boolean;
  duplicate: boolean;
  accountChange: boolean;
  rememberSupplier: boolean;
  reviewContext?: string;
};
export type Source = {
  name: string;
  hash?: string;
  method: string;
  note?: string | null;
  accountCandidates?: string[];
};
function parseData(row: Invoice): InvoiceData {
  return invoiceSchema.parse(JSON.parse(row.data));
}
function contextKey(i: InvoiceData, s: Settings, today: string) {
  // Consent metadata does not change a payment and must not invalidate legacy approvals.
  const paymentSettings: Partial<Settings> = { ...s };
  delete paymentSettings.aiConsentProvider;
  return createHash("sha256")
    .update(
      JSON.stringify({ settings: paymentSettings, date: effectiveDate(i.dueDate, s, today) }),
    )
    .digest("hex");
}
function findSupplier(i: InvoiceData, suppliers: SupplierData[]) {
  return matchSupplier(i, suppliers)?.supplier;
}
export async function listCompanies(db: PrismaClient) {
  const rows = await db.settings.findMany({ orderBy: { id: "asc" } });
  return rows.map((row) => ({
    id: row.id,
    name:
      settingsSchema.parse(JSON.parse(row.data)).companyName || "Minu ettevõte",
  }));
}
export async function createCompany(db: PrismaClient, name: string) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 140)
    throw new Error("Sisesta ettevõtte nimi (kuni 140 märki).");
  const row = await db.settings.create({
    data: {
      data: JSON.stringify({ ...defaultSettings(), companyName: trimmed }),
    },
  });
  return { id: row.id, name: trimmed };
}
export class InvoiceService {
  constructor(
    private db: PrismaClient,
    private now: () => Date = () => new Date(),
    private companyId: string = "default",
  ) {}
  private async settings(store: Store = this.db): Promise<Settings> {
    const row = await store.settings.findUnique({
      where: { id: this.companyId },
    });
    if (!row) throw new Error("Ettevõtet ei leitud. Vali ettevõte uuesti.");
    return settingsSchema.parse(JSON.parse(row.data));
  }
  async saveSettings(input: Settings) {
    const s = settingsSchema.parse(input);
    s.iban = s.iban.replace(/\s/g, "").toUpperCase();
    s.bic = s.bic.toUpperCase();
    s.countryCode = s.countryCode.toUpperCase();
    await this.db.settings.update({
      where: { id: this.companyId },
      data: { data: JSON.stringify(s) },
    });
    return s;
  }
  private async snapshot(store: Store = this.db) {
    const settings = await this.settings(store),
      today = estoniaToday(this.now());
    const rows = await store.invoice.findMany({
      where: { companyId: this.companyId },
      orderBy: { createdAt: "desc" },
    });
    const history = (
      await store.exportRecord.findMany({
        where: { companyId: this.companyId },
        select: { fingerprints: true },
      })
    ).flatMap((r) => JSON.parse(r.fingerprints) as Fingerprint[]);
    const suppliers = (
      await store.supplier.findMany({
        where: { companyId: this.companyId },
        orderBy: { createdAt: "desc" },
      })
    ).map((r) => ({ ...JSON.parse(r.data), id: r.id }) as SupplierData);
    const invoices = rows
      .filter((row) => !row.archivedAt)
      .map((row) => {
        const data = parseData(row),
          identity = invoiceIdentity(data);
        const duplicate =
          rows.some(
            (other) =>
              other.id !== row.id &&
              ((row.sourceFileHash &&
                other.sourceFileHash === row.sourceFileHash) ||
                (identity && invoiceIdentity(parseData(other)) === identity)),
          ) ||
          history.some(
            (old) =>
              old.invoiceId !== row.id &&
              ((row.sourceFileHash && old.hash === row.sourceFileHash) ||
                (identity && old.identity === identity)),
          );
        const supplier = findSupplier(data, suppliers),
          accountChanged = Boolean(
            supplier &&
            data.supplierIban &&
            !supplier.trustedIbans.includes(data.supplierIban),
          );
        const approved = Boolean(
          row.approvedAt &&
          row.approvalContext === contextKey(data, settings, today),
        );
        const ctx = {
          today,
          approved,
          duplicate,
          accountChanged,
          supplierConflict: supplierIdentityConflict(data, suppliers),
          duplicateAcknowledged: row.duplicateAcknowledged,
          accountChangeAcknowledged: row.accountChangeAcknowledged,
          exported: Boolean(row.exportedAt),
        };
        return {
          ...row,
          archivedAt: row.archivedAt?.toISOString() ?? null,
          reviewContext: contextKey(data, settings, today),
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          approvedAt: row.approvedAt?.toISOString() ?? null,
          exportedAt: row.exportedAt?.toISOString() ?? null,
          data,
          originalData: JSON.parse(row.originalData) as InvoiceData,
          accountCandidates: [...new Set([...(JSON.parse(row.accountCandidates) as string[]), ...(supplier?.trustedIbans ?? [])])],
          provenance: JSON.parse(row.provenance) as Record<string, string>,
          ...evaluateInvoice(data, settings, ctx),
          ...(row.exportedAt && row.exportedVersion === row.version
            ? { status: "EXPORTED" as const }
            : {}),
          duplicate,
          accountChanged,
          ctx,
          supplier: supplier ?? null,
        };
      });
    const ai = await aiStatus();
    return {
      companyId: this.companyId,
      settings,
      today,
      invoices,
      suppliers,
      payerIssues: validatePayer(settings),
      aiConfigured: ai.configured,
      desktop: process.env.ARVE_DESKTOP === "1",
      aiModel: ai.model,
      aiProvider: ai.provider,
      aiProviders: ai.providers,
    };
  }
  async state() {
    return this.snapshot();
  }
  async createInvoice(input: InvoiceData, source: Source) {
    await this.settings();
    const data = normalizeInvoice(invoiceSchema.parse(input));
    const originalData = structuredClone(data);
    const provenance: Record<string, string> = Object.fromEntries(
      invoiceFields
        .filter((f) => data[f])
        .map((f) => [f, source.method === "manual" ? "user" : "invoice"]),
    );
    let note = source.note ?? null;
    if (source.method !== "manual") {
      const settings = await this.settings();
      if (
        data.supplierName &&
        settings.companyName &&
        normalizedName(data.supplierName) ===
          normalizedName(settings.companyName)
      ) {
        data.supplierName = null;
        data.confidence.supplierName = 0;
        note = [
          note,
          "AI pakkus saajaks maksja ettevõtte nime. Nimi eemaldati; kontrolli tegelikku tarnijat algdokumendilt.",
        ]
          .filter(Boolean)
          .join(" ");
      }
      const suppliers = (
        await this.db.supplier.findMany({
          where: { companyId: this.companyId },
        })
      ).map((s) => ({ ...JSON.parse(s.data), id: s.id }) as SupplierData);
      const match = matchSupplier(data, suppliers);
      if (
        match &&
        normalizedName(match.supplier.name) !==
          normalizedName(settings.companyName)
      ) {
        for (const [key, value] of Object.entries(
          supplierValues(match.supplier, data),
        )) {
          const field = key as keyof ReturnType<typeof supplierValues>;
          if (value) {
            data[field] = value;
            provenance[field] = "supplier";
          }
        }
      }
    }
    return this.db.invoice.create({
      data: {
        companyId: this.companyId,
        sourceFileName: source.name,
        sourceFileHash: source.hash ?? null,
        data: JSON.stringify(data),
        originalData: JSON.stringify(originalData),
        extractionMethod: source.method,
        accountCandidates: JSON.stringify(source.accountCandidates ?? []),
        extractionNote: note,
        provenance: JSON.stringify(provenance),
      },
    });
  }
  async updateInvoice(id: string, version: number, input: InvoiceData) {
    const data = normalizeInvoice(invoiceSchema.parse(input));
    return this.db.$transaction(async (store) => {
      const row = await store.invoice.findUniqueOrThrow({
          where: { id, companyId: this.companyId },
        }),
        old = parseData(row),
        provenance = JSON.parse(row.provenance) as Record<string, string>;
      for (const f of invoiceFields)
        if (old[f] !== data[f]) provenance[f] = "user";
      // Confidence is extraction metadata; a client must not manufacture it.
      data.confidence = old.confidence;
      const changed = await store.invoice.updateMany({
        where: { id, version, companyId: this.companyId },
        data: {
          data: JSON.stringify(data),
          provenance: JSON.stringify(provenance),
          approvedAt: null,
          approvalContext: null,
          duplicateAcknowledged: false,
          accountChangeAcknowledged: false,
          version: { increment: 1 },
        },
      });
      if (!changed.count)
        throw new Error(
          "Arve on vahepeal muutunud. Värskenda vaadet ja kontrolli uuesti.",
        );
    });
  }
  async applySupplier(id: string, version: number) {
    return this.db.$transaction(async (store) => {
      const state = await this.snapshot(store),
        item = state.invoices.find((i) => i.id === id);
      if (!item?.supplier)
        throw new Error("Kinnitatud tarnijaandmed puuduvad.");
      const data = { ...item.data },
        provenance = { ...item.provenance },
        s = item.supplier;
      const values = supplierValues(s, data);
      for (const [key, value] of Object.entries(values)) {
        const k = key as keyof typeof values;
        if (value) {
          data[k] = value;
          provenance[k] = "supplier";
        }
      }
      const result = await store.invoice.updateMany({
        where: { id, version, companyId: this.companyId },
        data: {
          data: JSON.stringify(data),
          provenance: JSON.stringify(provenance),
          approvedAt: null,
          approvalContext: null,
          duplicateAcknowledged: false,
          accountChangeAcknowledged: false,
          version: { increment: 1 },
        },
      });
      if (!result.count)
        throw new Error("Arve on vahepeal muutunud. Värskenda vaadet.");
    });
  }
  async approve(id: string, version: number, ack: Approval) {
    if (!ack.reviewed)
      throw new Error("Kinnita, et kontrollisid andmeid algdokumendilt.");
    return this.db.$transaction(async (store) => {
      const state = await this.snapshot(store),
        item = state.invoices.find((i) => i.id === id);
      if (!item) throw new Error("Arvet ei leitud.");
      if (ack.reviewContext !== item.reviewContext)
        throw new Error(
          "Makse seaded või kuupäev on vahepeal muutunud. Sulge arve, värskenda lehte ja kontrolli makseandmed uuesti.",
        );
      const checked = evaluateInvoice(item.data, state.settings, {
        ...item.ctx,
        approved: true,
        duplicateAcknowledged: ack.duplicate,
        accountChangeAcknowledged: ack.accountChange,
      });
      if (checked.status !== "READY")
        throw new Error(
          checked.issues
            .filter((x) => x.severity !== "warning")
            .map((x) => x.message)
            .join(" "),
        );
      const result = await store.invoice.updateMany({
        where: { id, version, companyId: this.companyId },
        data: {
          approvedAt: this.now(),
          approvalContext: contextKey(item.data, state.settings, state.today),
          duplicateAcknowledged: ack.duplicate,
          accountChangeAcknowledged: ack.accountChange,
          version: { increment: 1 },
        },
      });
      if (!result.count)
        throw new Error("Arve on vahepeal muutunud. Värskenda vaadet.");
      if (ack.rememberSupplier) {
        const i = item.data,
          existing = item.supplier;
        const trusted: Omit<SupplierData, "id"> = {
          name: i.supplierName!,
          registrationCode: i.supplierRegistrationCode,
          trustedIbans: [
            ...new Set([...(existing?.trustedIbans ?? []), i.supplierIban!]),
          ],
          bic: i.supplierBic ?? existing?.bic ?? null,
          address: i.supplierAddress ?? existing?.address ?? null,
          street: i.supplierStreet ?? existing?.street ?? null,
          buildingNumber:
            i.supplierBuildingNumber ?? existing?.buildingNumber ?? null,
          postalCode: i.supplierPostalCode ?? existing?.postalCode ?? null,
          town: i.supplierTown ?? existing?.town ?? null,
          countryCode: i.supplierCountryCode ?? existing?.countryCode ?? null,
        };
        if (existing)
          await store.supplier.update({
            where: { id: existing.id, companyId: this.companyId },
            data: { data: JSON.stringify(trusted) },
          });
        else
          await store.supplier.create({
            data: {
              companyId: this.companyId,
              identity: i.supplierRegistrationCode
                ? `reg:${i.supplierRegistrationCode}`
                : `name:${normalizedName(i.supplierName!)}`,
              data: JSON.stringify(trusted),
            },
          });
      }
    });
  }
  async deleteInvoice(id: string) {
    await this.db.$transaction(async (store) => {
      const row = await store.invoice.findUniqueOrThrow({
        where: { id, companyId: this.companyId },
      });
      if (row.exportedAt)
        await store.invoice.update({
          where: { id, companyId: this.companyId },
          data: {
            archivedAt: this.now(),
            approvedAt: null,
            approvalContext: null,
            version: { increment: 1 },
          },
        });
      else
        await store.invoice.delete({
          where: { id, companyId: this.companyId },
        });
    });
  }
  async deleteSupplier(id: string) {
    await this.db.supplier.delete({ where: { id, companyId: this.companyId } });
  }
  async updateSupplier(id: string, input: unknown) {
    const data = supplierSchema.parse(input);
    data.trustedIbans = [...new Set(data.trustedIbans)];
    await this.db.$transaction(async (store) => {
      const state = await this.snapshot(store);
      await store.supplier.update({
        where: { id, companyId: this.companyId },
        data: {
          identity: data.registrationCode
            ? `reg:${data.registrationCode}`
            : `name:${normalizedName(data.name)}`,
          data: JSON.stringify(data),
        },
      });
      // Never change already reviewed invoice values behind the user's back.
      await store.invoice.updateMany({
        where: {
          companyId: this.companyId,
          id: {
            in: state.invoices
              .filter((i) => i.supplier?.id === id && i.approvedAt)
              .map((i) => i.id),
          },
        },
        data: {
          approvedAt: null,
          approvalContext: null,
          accountChangeAcknowledged: false,
          version: { increment: 1 },
        },
      });
    });
  }
  async exportInvoices(ids: string[]) {
    if (!ids.length || ids.length > 500 || new Set(ids).size !== ids.length)
      throw new Error("Vali 1–500 erinevat kinnitatud arvet.");
    // Keep approval checks, export record and approval revocation in one serialized transaction.
    return this.db.$transaction(
      async (store) => {
        const state = await this.snapshot(store);
        if (state.payerIssues.length)
          throw new Error(state.payerIssues.map((i) => i.message).join(" "));
        const payments = ids.map((id) => {
          const item = state.invoices.find((i) => i.id === id);
          if (!item) throw new Error("Valitud arvet ei leitud.");
          return toPayment(item.id, item.data, state.settings, item.ctx);
        });
        const adapter = bankAdapters[state.settings.preferredBank],
          id = randomUUID();
        const xml = adapter.buildPaymentFile(payments, state.settings, {
          now: this.now(),
          id: id.replaceAll("-", ""),
        });
        const validation = await adapter.validateGeneratedXml(xml);
        if (validation.status !== "valid") throw new Error(validation.message);
        const total = formatCents(
          payments.reduce((a, p) => a + parseCents(p.amount)!, 0n),
        );
        const fingerprints: Fingerprint[] = ids.map((invoiceId) => {
          const item = state.invoices.find((i) => i.id === invoiceId)!;
          return {
            invoiceId,
            hash: item.sourceFileHash,
            identity: invoiceIdentity(item.data),
          };
        });
        await store.exportRecord.create({
          data: {
            id,
            companyId: this.companyId,
            bank: adapter.id,
            invoiceIds: JSON.stringify(ids),
            fingerprints: JSON.stringify(fingerprints),
            total,
            xmlHash: createHash("sha256").update(xml).digest("hex"),
          },
        });
        for (const invoiceId of ids)
          await store.invoice.update({
            where: { id: invoiceId, companyId: this.companyId },
            data: {
              exportedAt: this.now(),
              exportedVersion:
                state.invoices.find((i) => i.id === invoiceId)!.version + 1,
              approvedAt: null,
              approvalContext: null,
              duplicateAcknowledged: false,
              version: { increment: 1 },
            },
          });
        return {
          xml,
          validation,
          total,
          count: payments.length,
          filename: `maksed_${state.today}_${adapter.id}.xml`,
        };
      },
      { timeout: 20000 },
    );
  }
}
export type AppState = Awaited<ReturnType<InvoiceService["state"]>>;
export type InvoiceView = AppState["invoices"][number];
