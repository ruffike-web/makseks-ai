import { z } from "zod";
import { getDb } from "@/lib/db";
import { InvoiceService, createCompany, listCompanies } from "@/lib/service";
import { blankInvoice, invoiceSchema, settingsSchema } from "@/lib/domain";
import {
  extractInvoice,
  createExtractionProvider,
  validateUpload,
} from "@/lib/extraction";
import { boundedBody, checkLocalRequest } from "@/lib/http-security";
import { saveAIConfig, availableAIModels, readAIConfig } from "@/lib/ai-config";
import { aiProviderIds } from "@/lib/ai-providers";
import { readUIPreferences, saveUIPreferences } from "@/lib/ui-preferences";
import { consentMatchesProvider, consentedExtractionProvider } from "@/lib/ai-consent";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
class BadRequestBody extends Error {}
function parseJson(bytes: Uint8Array): unknown {
  if (!bytes.length) return {};
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new BadRequestBody("Päringu andmed on vigased. Värskenda lehte ja proovi uuesti.");
  }
}
const versionSchema = z.string().regex(/^\d{1,9}$/).transform(Number);
const approvalSchema = z
  .object({
    version: z.number().int().nonnegative(),
    reviewContext: z.string().length(64),
    reviewed: z.literal(true),
    duplicate: z.boolean(),
    accountChange: z.boolean(),
    rememberSupplier: z.boolean(),
  })
  .strict();
async function handle(request: Request, context: Context) {
  try {
    checkLocalRequest(request, request.method !== "GET");
    const { path } = await context.params;
    const [resource, id, action] = path;
    const json = (value: unknown) =>
      Response.json(value, { headers: { "Cache-Control": "no-store" } });
    if (resource === "preferences" && path.length === 1) {
      if (request.method === "GET") return json(readUIPreferences());
      if (request.method === "PUT") {
        const bytes = await boundedBody(request, 1000);
        return json(saveUIPreferences(parseJson(bytes)));
      }
      return new Response(null, { status: 405 });
    }
    const db = getDb();
    if (resource === "companies" && path.length === 1) {
      if (request.method === "GET") return json(await listCompanies(db));
      if (request.method === "POST") {
        const bytes = await boundedBody(request, 2000);
        const input = z
          .object({ name: z.string().trim().min(1).max(140) })
          .strict()
          .parse(parseJson(bytes));
        return json(await createCompany(db, input.name));
      }
    }
    const companyId = request.headers.get("X-Company-Id");
    if (
      !companyId ||
      !(await db.settings.findUnique({
        where: { id: companyId },
        select: { id: true },
      }))
    )
      throw new Error("Vali kehtiv ettevõte. Värskenda vajadusel lehte.");
    const service = new InvoiceService(db, undefined, companyId);
    if (request.method === "GET" && resource === "state" && path.length === 1)
      return json(await service.state());
    if (request.method === "POST" && resource === "upload" && path.length === 1) {
      const maxMb = Math.min(
        20,
        Math.max(1, Number(process.env.MAX_UPLOAD_MB) || 10),
      );
      const bytes = await boundedBody(request, (maxMb + 1) * 1024 * 1024);
      const form = await new Response(bytes as BodyInit, {
        headers: { "Content-Type": request.headers.get("content-type") ?? "" },
      }).formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new Error("Vali arvefail.");
      const buffer = Buffer.from(await file.arrayBuffer()),
        meta = validateUpload(buffer, file.type, file.name, maxMb);
      const mode = z.enum(["local", "manual", "ai"]).parse(form.get("mode") ?? "local");
      const state = await service.state(),
        consented =
          mode === "ai"
            ? consentedExtractionProvider(state.settings, {
                configured: state.aiConfigured,
                provider: state.aiProvider,
              })
            : null,
        provider = consented ? createExtractionProvider(consented) : null;
      if (mode === "ai" && !provider) throw new Error("AI lugemine vajab API-võtit ja selle ettevõtte nõusolekut seadetes.");
      const result = await extractInvoice(buffer, meta.mime, provider, { mode, payer: state.settings });
      const invoice = await service.createInvoice(result.data, {
        ...meta,
        method: result.method,
        accountCandidates: result.accountCandidates,
        note: result.note,
      });
      return json({
        id: invoice.id,
        note: result.note,
        nativeText: result.nativeText,
      });
    }
    if (request.method === "DELETE") {
      if (resource === "invoices" && id && path.length === 2) {
        const version = versionSchema.parse(
          new URL(request.url).searchParams.get("version"),
        );
        await service.deleteInvoice(id, version);
        return json({ ok: true });
      }
      if (resource === "suppliers" && id && path.length === 2) {
        await service.deleteSupplier(id);
        return json({ ok: true });
      }
    }
    const body = parseJson(await boundedBody(request, 200000));
    if (resource === "ai-config" && path.length === 1 && request.method === "PUT") {
      const input = z
        .object({
          provider: z.enum(aiProviderIds).optional(),
          apiKey: z.string().max(512).optional(),
          model: z.string().min(1).max(150),
          removeKey: z.boolean().optional(),
        })
        .strict()
        .parse(body);
      const previous = (await readAIConfig()).provider;
      // Save first: if the save fails, consent and the active provider stay as
      // they were. Until consent is cleared below, uploads remain blocked
      // because the stored consent names the previous provider.
      const status = await saveAIConfig(input);
      if (status.provider !== previous)
        await db.$transaction(async (tx) => {
          const rows = await tx.settings.findMany();
          for (const row of rows) {
            const settings = settingsSchema.parse(JSON.parse(row.data));
            await tx.settings.update({
              where: { id: row.id },
              data: { data: JSON.stringify({ ...settings, aiEnabled: false }) },
            });
          }
        });
      return json(status);
    }
    if (
      resource === "ai-config" &&
      id === "models" &&
      path.length === 2 &&
      request.method === "POST"
    ) {
      const input = z
        .object({
          provider: z.enum(aiProviderIds).optional(),
          apiKey: z.string().max(512).optional(),
        })
        .strict()
        .parse(body);
      return json(await availableAIModels(input.apiKey, input.provider));
    }
    if (resource === "settings" && path.length === 1 && request.method === "PUT") {
      const settings = settingsSchema.parse(body);
      if (!consentMatchesProvider(settings, (await readAIConfig()).provider))
        throw new Error(
          "AI-teenusepakkuja on muutunud. Värskenda lehte ja luba arveandmete saatmine valitud teenusele uuesti.",
        );
      return json(await service.saveSettings(settings));
    }
    if (resource === "suppliers" && id && path.length === 2 && request.method === "PUT") {
      await service.updateSupplier(id, body);
      return json({ ok: true });
    }
    if (resource === "invoices" && request.method === "POST" && path.length === 1)
      return json(
        await service.createInvoice(blankInvoice(), {
          name: "Käsitsi lisatud arve",
          method: "manual",
        }),
      );
    if (resource === "invoices" && id && path.length === 2 && request.method === "PUT") {
      const input = z
        .object({
          version: z.number().int().nonnegative(),
          data: invoiceSchema,
        })
        .strict()
        .parse(body);
      await service.updateInvoice(id, input.version, input.data);
      return json({ ok: true });
    }
    if (
      resource === "invoices" &&
      id &&
      path.length === 3 &&
      (action === "archive" || action === "restore") &&
      request.method === "POST"
    ) {
      const input = z
        .object({ version: z.number().int().nonnegative() })
        .strict()
        .parse(body);
      if (action === "archive") await service.archiveInvoice(id, input.version);
      else await service.restoreInvoice(id, input.version);
      return json({ ok: true });
    }
    if (
      resource === "invoices" &&
      id &&
      path.length === 3 &&
      action === "approve" &&
      request.method === "POST"
    ) {
      const input = approvalSchema.parse(body);
      await service.approve(id, input.version, input);
      return json({ ok: true });
    }
    if (
      resource === "invoices" &&
      id &&
      path.length === 3 &&
      action === "supplier" &&
      request.method === "POST"
    ) {
      const input = z
        .object({ version: z.number().int().nonnegative() })
        .strict()
        .parse(body);
      await service.applySupplier(id, input.version);
      return json({ ok: true });
    }
    if (resource === "export" && path.length === 1 && request.method === "POST") {
      const input = z
        .object({
          ids: z.array(z.string()).min(1).max(500),
        })
        .strict()
        .parse(body);
      return json(await service.exportInvoices(input.ids));
    }
    return Response.json({ error: "Päringut ei leitud." }, { status: 404 });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Sisestatud andmed ei vasta oodatud vormingule."
        : error instanceof BadRequestBody
          ? error.message
          : error instanceof SyntaxError || error instanceof TypeError
            ? "Päringu töötlemine ebaõnnestus. Värskenda lehte ja proovi uuesti."
            : error instanceof Error &&
            !/prisma|SQLITE|Invalid `|database/i.test(error.message)
          ? error.message
          : "Andmete salvestamine ebaõnnestus. Kontrolli, et andmebaas on seadistatud ja proovi uuesti.";
    return Response.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
