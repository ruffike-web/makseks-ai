import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { bankAdapters } from "../src/lib/banks";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { createDb } from "../src/lib/db";
import {
  InvoiceService,
  createCompany,
  listCompanies,
} from "../src/lib/service";
import type { Approval } from "../src/lib/service";
import { blankInvoice, defaultSettings } from "../src/lib/domain";

const temp = mkdtempSync(join(tmpdir(), "arve-test-")),
  path = join(temp, "test.db");
let db: ReturnType<typeof createDb>, service: InvoiceService;
async function approve(id: string, version: number, ack: Approval) {
  const state = await service.state();
  return service.approve(id, version, {
    ...ack,
    reviewContext: state.invoices.find((i) => i.id === id)!.reviewContext,
  });
}
const data = {
  ...blankInvoice(),
  supplierName: "Test Tarnija OÜ",
  supplierRegistrationCode: "12345678",
  supplierIban: "EE382200221020145685",
  invoiceNumber: "INV-1",
  amountDue: "10.10",
  currency: "EUR",
  dueDate: "2026-10-20",
};
beforeAll(async () => {
  const sql = new DatabaseSync(path);
  for (const d of readdirSync("prisma/migrations")
    .filter((d) => /^\d/.test(d))
    .sort())
    sql.exec(readFileSync(`prisma/migrations/${d}/migration.sql`, "utf8"));
  sql.close();
  db = createDb(`file:${path}`);
  service = new InvoiceService(db, () => new Date("2026-10-06T09:00:00Z"));
});
beforeEach(async () => {
  await db.invoice.deleteMany();
  await db.supplier.deleteMany();
  await db.exportRecord.deleteMany();
  await service.saveSettings({
    ...defaultSettings(),
    companyName: "Test Maksja OÜ",
    iban: "EE121010000000000016",
  });
});
afterAll(async () => {
  await db?.$disconnect();
  rmSync(temp, { recursive: true, force: true });
});
describe("persistent approval boundary", () => {
  it("blocks conflicting saved supplier name and account identities without replacing the invoice name", async () => {
    for (const [index, invoice] of [data, { ...data, supplierName: "Teine OÜ", supplierRegistrationCode: "87654321", supplierIban: "EE121010000000000016", invoiceNumber: "INV-B" }].entries()) {
      const row = await service.createInvoice(invoice, { name: `supplier-${index}`, method: "manual" });
      await approve(row.id, 0, { reviewed: true, duplicate: false, accountChange: false, rememberSupplier: true });
    }
    const row = await service.createInvoice({ ...data, supplierRegistrationCode: null, supplierIban: "EE121010000000000016", invoiceNumber: "CONFLICT-1" }, { name: "local.pdf", method: "pdf-text-local" });
    const item = (await service.state()).invoices.find((i) => i.id === row.id)!;
    expect(item.data.supplierName).toBe(data.supplierName);
    expect(item.issues.some((issue) => issue.code === "SUPPLIER_CONFLICT")).toBe(true);
    await expect(approve(row.id, row.version, { reviewed: true, duplicate: true, accountChange: true, rememberSupplier: true })).rejects.toThrow();
  });
  it.each(["registration", "name"])("fills all saved supplier fields including a missing IBAN on local import matched by %s", async (matchBy) => {
    const first = await service.createInvoice(data, { name: "manual", method: "manual" });
    await approve(first.id, 0, { reviewed: true, duplicate: false, accountChange: false, rememberSupplier: true });
    const supplier = (await service.state()).suppliers[0];
    await service.updateSupplier(supplier.id, { ...supplier, bic: "HABAEE2X", address: "Testi 1", street: "Testi", buildingNumber: "1", postalCode: "10111", town: "Tallinn", countryCode: "EE" });
    const row = await service.createInvoice({ ...data, supplierIban: null, supplierRegistrationCode: matchBy === "name" ? null : data.supplierRegistrationCode, invoiceNumber: "NEW-2" }, { name: "local.pdf", method: "pdf-text-local", accountCandidates: [data.supplierIban!, "EE121010000000000016"] });
    const item = (await service.state()).invoices.find((i) => i.id === row.id)!;
    expect(item.data).toMatchObject({ supplierName: data.supplierName, supplierRegistrationCode: data.supplierRegistrationCode, supplierIban: data.supplierIban, supplierBic: "HABAEE2X", supplierAddress: "Testi 1", supplierStreet: "Testi", supplierBuildingNumber: "1", supplierPostalCode: "10111", supplierTown: "Tallinn", supplierCountryCode: "EE", invoiceNumber: "NEW-2", amountDue: "10.10" });
    expect(item.originalData.supplierIban).toBeNull();
    expect(item.provenance.supplierIban).toBe("supplier");
    expect(item.status).toBe("REVIEW_REQUIRED");
  });
  it("fills a missing account when applying saved supplier details to an existing invoice", async () => {
    const first = await service.createInvoice(data, { name: "manual", method: "manual" });
    await approve(first.id, 0, { reviewed: true, duplicate: false, accountChange: false, rememberSupplier: true });
    const row = await service.createInvoice({ ...data, supplierIban: null, invoiceNumber: "OLD-2" }, { name: "manual", method: "manual" });
    await service.applySupplier(row.id, row.version);
    expect((await service.state()).invoices.find((i) => i.id === row.id)!.data.supplierIban).toBe(data.supplierIban);
  });
  it("persists printed account choices without approving or selecting one automatically", async () => {
    const accounts = ["EE382200221020145685", "EE121010000000000016"];
    const row = await service.createInvoice({ ...data, supplierIban: null }, { name: "local.pdf", method: "pdf-text-local", accountCandidates: accounts });
    const item = (await service.state()).invoices.find(i => i.id === row.id)!;
    expect(item.accountCandidates).toEqual(accounts);
    expect(item.data.supplierIban).toBeNull();
    expect(item.approvedAt).toBeNull();
    await service.updateInvoice(row.id, row.version, { ...item.data, supplierIban: accounts[0] });
    expect((await service.state()).invoices.find(i => i.id === row.id)!.accountCandidates).toEqual(accounts);
  });
  it("preserves pre-provider-consent payment approvals", async () => {
    const invoice = await service.createInvoice(data, { name: "legacy", method: "manual" });
    const legacy: Partial<ReturnType<typeof defaultSettings>> = { ...(await service.state()).settings };
    delete legacy.aiConsentProvider;
    const approvalContext = createHash("sha256").update(JSON.stringify({ settings: legacy, date: "2026-10-20" })).digest("hex");
    await db.invoice.update({ where: { id: invoice.id }, data: { approvedAt: new Date(), approvalContext } });
    expect((await service.state()).invoices.find(i => i.id === invoice.id)?.status).toBe("READY");
  });
  it("isolates companies including settings, suppliers, duplicates and all invoice mutations", async () => {
    const company = await createCompany(db, "Teine ettevõte OÜ");
    const other = new InvoiceService(
      db,
      () => new Date("2026-10-06T09:00:00Z"),
      company.id,
    );
    expect((await listCompanies(db)).some((c) => c.id === company.id)).toBe(
      true,
    );
    expect((await other.state()).settings.companyName).toBe(
      "Teine ettevõte OÜ",
    );
    const row = await service.createInvoice(data, {
      name: "a",
      method: "manual",
      hash: "same",
    });
    await approve(row.id, 0, {
      reviewed: true,
      duplicate: false,
      accountChange: false,
      rememberSupplier: true,
    });
    const first = (await service.state()).invoices[0];
    const supplier = (await service.state()).suppliers[0];
    expect((await other.state()).invoices).toHaveLength(0);
    expect((await other.state()).suppliers).toHaveLength(0);
    await expect(
      other.updateInvoice(row.id, first.version, data),
    ).rejects.toThrow();
    await expect(other.deleteInvoice(row.id)).rejects.toThrow();
    await expect(other.applySupplier(row.id, first.version)).rejects.toThrow();
    await expect(
      other.approve(row.id, first.version, {
        reviewed: true,
        duplicate: false,
        accountChange: false,
        rememberSupplier: false,
        reviewContext: first.reviewContext,
      }),
    ).rejects.toThrow();
    await expect(other.updateSupplier(supplier.id, supplier)).rejects.toThrow();
    await expect(other.deleteSupplier(supplier.id)).rejects.toThrow();
    await other.saveSettings({
      ...defaultSettings(),
      companyName: "Teine ettevõte OÜ",
      iban: "EE337700771001260958",
      preferredBank: "LHV",
    });
    await expect(other.exportInvoices([row.id])).rejects.toThrow();
    const second = await other.createInvoice(
      { ...data, supplierName: "Muu loetud nimi" },
      { name: "b", method: "vision-gemini", hash: "same" },
    );
    const view = (await other.state()).invoices[0];
    expect(view.duplicate).toBe(false);
    expect(view.data.supplierName).toBe("Muu loetud nimi");
    await other.approve(second.id, second.version, {
      reviewed: true,
      duplicate: false,
      accountChange: false,
      rememberSupplier: true,
      reviewContext: view.reviewContext,
    });
    expect((await other.state()).suppliers).toHaveLength(1);
    expect((await service.state()).settings.companyName).toBe("Test Maksja OÜ");
    await service.exportInvoices([row.id]);
    expect((await other.state()).invoices[0].duplicate).toBe(false);
    const xml = (await other.exportInvoices([second.id])).xml;
    expect(xml).toContain("Teine ettevõte OÜ");
    expect(xml).not.toContain("Test Maksja OÜ");
  });
  it("does not record an export when complete LHV schema validation fails", async () => {
    await service.saveSettings({
      ...defaultSettings(),
      preferredBank: "LHV",
      companyName: "Test Maksja OÜ",
      iban: "EE337700771001260958",
    });
    const row = await service.createInvoice(data, {
      name: "manual",
      method: "manual",
    });
    await approve(row.id, 0, {
      reviewed: true,
      duplicate: false,
      accountChange: false,
      rememberSupplier: false,
    });
    const check = vi
      .spyOn(bankAdapters.LHV, "validateGeneratedXml")
      .mockResolvedValue({
        status: "invalid",
        message: "XSD kontroll ebaõnnestus",
      });
    try {
      await expect(service.exportInvoices([row.id])).rejects.toThrow(
        "XSD kontroll",
      );
      expect(await db.exportRecord.count()).toBe(0);
      expect((await service.state()).invoices[0].exportedAt).toBeNull();
    } finally {
      check.mockRestore();
    }
  });
  it("keeps exported invoices completed until their data is edited", async () => {
    const row = await service.createInvoice(data, {
      name: "manual",
      method: "manual",
    });
    await approve(row.id, 0, {
      reviewed: true,
      duplicate: false,
      accountChange: false,
      rememberSupplier: false,
    });
    expect((await service.state()).invoices[0].status).toBe("READY");
    await service.exportInvoices([row.id]);
    const done = (await service.state()).invoices[0];
    expect(done.status).toBe("EXPORTED");
    await expect(service.exportInvoices([row.id])).rejects.toThrow();
    await service.updateInvoice(row.id, done.version, {
      ...data,
      amountDue: "12.00",
    });
    expect((await service.state()).invoices[0].status).toBe("REVIEW_REQUIRED");
  });
  it.each(["vision-gemini", "pdf-text-local"])("uses edited supplier details for an unambiguous account match from %s, preserving invoice values", async (method) => {
    const row = await service.createInvoice(data, {
      name: "manual",
      method: "manual",
    });
    await approve(row.id, 0, {
      reviewed: true,
      duplicate: false,
      accountChange: false,
      rememberSupplier: true,
    });
    const supplier = (await service.state()).suppliers[0];
    await service.updateSupplier(supplier.id, {
      ...supplier,
      name: "Parandatud OÜ",
      town: "Tartu",
      countryCode: "EE",
    });
    const next = await service.createInvoice(
      {
        ...data,
        supplierName: "OCR viga",
        supplierRegistrationCode: null,
        invoiceNumber: "INV-2",
      },
      { name: "scan", method },
    );
    const item = (await service.state()).invoices.find(
      (i) => i.id === next.id,
    )!;
    expect(item.data.supplierName).toBe("Parandatud OÜ");
    expect(item.data.supplierTown).toBe("Tartu");
    expect(item.data.amountDue).toBe("10.10");
    expect(item.originalData.supplierName).toBe("OCR viga");
    expect(item.provenance.supplierName).toBe("supplier");
    expect(item.status).toBe("REVIEW_REQUIRED");
  });
  it("rejects the configured payer name as an AI supplier fallback", async () => {
    await service.createInvoice(
      { ...data, supplierName: "Test Maksja OÜ" },
      { name: "scan", method: "vision-gemini" },
    );
    expect((await service.state()).invoices[0].data.supplierName).toBeNull();
  });
  it("refuses approval when settings changed since the editor opened", async () => {
    const i = await service.createInvoice(data, {
      name: "manual",
      method: "manual",
    });
    const viewed = (await service.state()).invoices[0];
    await service.saveSettings({
      ...defaultSettings(),
      companyName: "Test Maksja OÜ",
      iban: "EE121010000000000016",
      dateMode: "today",
    });
    await expect(
      service.approve(i.id, 0, {
        reviewed: true,
        duplicate: false,
        accountChange: false,
        rememberSupplier: false,
        reviewContext: viewed.reviewContext,
      }),
    ).rejects.toThrow();
  });
  it("preserves duplicate protection after deleting an exported invoice", async () => {
    const i = await service.createInvoice(data, {
      name: "a.pdf",
      hash: "filehash",
      method: "manual",
    });
    await approve(i.id, 0, {
      reviewed: true,
      duplicate: false,
      accountChange: false,
      rememberSupplier: false,
    });
    await service.exportInvoices([i.id]);
    await service.deleteInvoice(i.id);
    const copy = await service.createInvoice(data, {
      name: "a-copy.pdf",
      hash: "filehash",
      method: "manual",
    });
    expect(
      (await service.state()).invoices.find((i) => i.id === copy.id)?.duplicate,
    ).toBe(true);
  });
  it("retains the originally exported identity when an exported invoice is edited", async () => {
    const i = await service.createInvoice(data, {
      name: "a.pdf",
      hash: "firsthash",
      method: "manual",
    });
    await approve(i.id, 0, {
      reviewed: true,
      duplicate: false,
      accountChange: false,
      rememberSupplier: false,
    });
    await service.exportInvoices([i.id]);
    const old = (await service.state()).invoices[0];
    await service.updateInvoice(i.id, old.version, {
      ...data,
      invoiceNumber: "CHANGED",
    });
    const copy = await service.createInvoice(data, {
      name: "rescan.pdf",
      hash: "differenthash",
      method: "manual",
    });
    expect(
      (await service.state()).invoices.find((row) => row.id === copy.id)
        ?.duplicate,
    ).toBe(true);
  });
  it("blocks direct export and revokes approval after editing", async () => {
    const i = await service.createInvoice(data, {
      name: "manual",
      method: "manual",
    });
    await expect(service.exportInvoices([i.id])).rejects.toThrow();
    await approve(i.id, i.version, {
      reviewed: true,
      duplicate: false,
      accountChange: false,
      rememberSupplier: false,
    });
    let state = await service.state();
    expect(state.invoices[0].status).toBe("READY");
    await service.updateInvoice(i.id, state.invoices[0].version, {
      ...data,
      amountDue: "20.20",
    });
    state = await service.state();
    expect(state.invoices[0].status).toBe("REVIEW_REQUIRED");
    await expect(service.exportInvoices([i.id])).rejects.toThrow();
  });
  it("revalidates changed settings and rejects stale edits", async () => {
    const i = await service.createInvoice(data, {
      name: "manual",
      method: "manual",
    });
    await approve(i.id, i.version, {
      reviewed: true,
      duplicate: false,
      accountChange: false,
      rememberSupplier: false,
    });
    await expect(
      service.updateInvoice(i.id, i.version, { ...data, amountDue: "99" }),
    ).rejects.toThrow();
    await service.saveSettings({
      ...defaultSettings(),
      companyName: "Test Maksja OÜ",
      iban: "EE121010000000000016",
      dateMode: "today",
    });
    expect((await service.state()).invoices[0].status).toBe("REVIEW_REQUIRED");
  });
  it("finds file and business duplicates and requires separate acknowledgement", async () => {
    await service.createInvoice(data, {
      name: "first.pdf",
      hash: "same",
      method: "manual",
    });
    const duplicate = await service.createInvoice(
      { ...data, invoiceNumber: "INV-2" },
      { name: "copy.pdf", hash: "same", method: "manual" },
    );
    await expect(
      approve(duplicate.id, 0, {
        reviewed: true,
        duplicate: false,
        accountChange: false,
        rememberSupplier: false,
      }),
    ).rejects.toThrow();
    await approve(duplicate.id, 0, {
      reviewed: true,
      duplicate: true,
      accountChange: false,
      rememberSupplier: false,
    });
    expect(
      (await service.state()).invoices.find((i) => i.id === duplicate.id)
        ?.status,
    ).toBe("READY");
    const business = await service.createInvoice(
      { ...data, supplierName: " TEST TARNIJA OÜ " },
      { name: "third.pdf", hash: "different", method: "manual" },
    );
    expect(
      (await service.state()).invoices.find((i) => i.id === business.id)
        ?.duplicate,
    ).toBe(true);
  });
  it("does not silently trust a changed supplier account", async () => {
    const first = await service.createInvoice(data, {
      name: "manual",
      method: "manual",
    });
    await approve(first.id, 0, {
      reviewed: true,
      duplicate: false,
      accountChange: false,
      rememberSupplier: true,
    });
    const second = await service.createInvoice(
      { ...data, invoiceNumber: "INV-2", supplierIban: "EE337700771001260958" },
      { name: "manual", method: "manual" },
    );
    await expect(
      approve(second.id, 0, {
        reviewed: true,
        duplicate: false,
        accountChange: false,
        rememberSupplier: true,
      }),
    ).rejects.toThrow();
    await approve(second.id, 0, {
      reviewed: true,
      duplicate: false,
      accountChange: true,
      rememberSupplier: false,
    });
    expect((await service.state()).suppliers[0].trustedIbans).toEqual([
      data.supplierIban,
    ]);
  });
  it("exports schema-valid XML and prevents accidental repeat export", async () => {
    const i = await service.createInvoice(data, {
      name: "manual",
      method: "manual",
    });
    await approve(i.id, 0, {
      reviewed: true,
      duplicate: false,
      accountChange: false,
      rememberSupplier: false,
    });
    const result = await service.exportInvoices([i.id]);
    expect(result.xml).toContain("10.10");
    expect(result.validation.status).toBe("valid");
    expect(await db.exportRecord.count()).toBe(1);
    await expect(service.exportInvoices([i.id])).rejects.toThrow();
  });
});
