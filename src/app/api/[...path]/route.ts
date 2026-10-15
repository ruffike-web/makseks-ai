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
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
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
        return json(saveUIPreferences(JSON.parse(new TextDecoder().decode(bytes))));
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
          .parse(JSON.parse(new TextDecoder().decode(bytes)));
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
    if (request.method === "GET" && resource === "state")
      return json(await service.state());
    if (request.method === "POST" && resource === "upload") {
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
        provider =
          mode === "ai" && state.settings.aiEnabled &&
          state.aiConfigured &&
          state.settings.aiConsentProvider === state.aiProvider
            ? createExtractionProvider(state.aiProvider)
            : null;
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
      if (resource === "invoices" && id) {
        await service.deleteInvoice(id);
        return json({ ok: true });
      }
      if (resource === "suppliers" && id) {
        await service.deleteSupplier(id);
        return json({ ok: true });
      }
    }
    const bytes = await boundedBody(request, 200000),
      body = bytes.length ? JSON.parse(new TextDecoder().decode(bytes)) : {};
    if (resource === "ai-config" && request.method === "PUT") {
      const input = z
        .object({
          provider: z.enum(aiProviderIds).optional(),
          apiKey: z.string().max(512).optional(),
          model: z.string().min(1).max(150),
          removeKey: z.boolean().optional(),
        })
        .strict()
        .parse(body);
      if (input.provider && input.provider !== (await readAIConfig()).provider) {
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
      }
      return json(await saveAIConfig(input));
    }
    if (
      resource === "ai-config" &&
      id === "models" &&
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
    if (resource === "settings" && request.method === "PUT") {
      const settings = settingsSchema.parse(body);
      if (
        settings.aiEnabled &&
        settings.aiConsentProvider !== (await readAIConfig()).provider
      )
        throw new Error(
          "AI-teenusepakkuja on muutunud. Värskenda lehte ja luba arveandmete saatmine valitud teenusele uuesti.",
        );
      return json(await service.saveSettings(settings));
    }
    if (resource === "suppliers" && id && request.method === "PUT") {
      await service.updateSupplier(id, body);
      return json({ ok: true });
    }
    if (resource === "invoices" && request.method === "POST" && !id)
      return json(
        await service.createInvoice(blankInvoice(), {
          name: "Käsitsi lisatud arve",
          method: "manual",
        }),
      );
    if (resource === "invoices" && id && request.method === "PUT") {
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
    if (resource === "export" && request.method === "POST") {
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
