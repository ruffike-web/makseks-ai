import { readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { aiProviders, aiProviderIds, type AIProviderId } from "./ai-providers";
const entrySchema = z.object({
  apiKey: z.string().trim().max(512),
  model: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)?$/)
    .max(150),
});
const schema = z.object({
  provider: z.enum(aiProviderIds),
  providers: z.object({
    gemini: entrySchema,
    openai: entrySchema,
    anthropic: entrySchema,
    groq: entrySchema,
    mistral: entrySchema,
  }),
});
function configPath() {
  return (
    process.env.ARVE_AI_CONFIG_FILE ||
    resolve(process.env.ARVE_DATA_DIR || "data", "ai-config.json")
  );
}
function defaults() {
  return {
    provider: "gemini" as AIProviderId,
    providers: {
      groq: { apiKey: process.env.GROQ_API_KEY || "", model: process.env.GROQ_MODEL || aiProviders.groq.defaultModel },
      mistral: { apiKey: process.env.MISTRAL_API_KEY || "", model: process.env.MISTRAL_MODEL || aiProviders.mistral.defaultModel },
      gemini: {
        apiKey: process.env.GEMINI_API_KEY || "",
        model: process.env.GEMINI_MODEL || aiProviders.gemini.defaultModel,
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY || "",
        model: process.env.OPENAI_MODEL || aiProviders.openai.defaultModel,
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || "",
        model:
          process.env.ANTHROPIC_MODEL || aiProviders.anthropic.defaultModel,
      },
    },
  };
}
function readAll() {
  try {
    const raw = JSON.parse(
      readFileSync(/* turbopackIgnore: true */ configPath(), "utf8"),
    );
    if (raw.provider) return schema.parse({ ...raw, providers: { ...defaults().providers, ...raw.providers } });
    const legacy = entrySchema.parse(raw),
      config = defaults();
    config.providers.gemini = legacy;
    return config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return schema.parse(defaults());
    throw new Error("AI seadistuse lugemine ebaõnnestus.");
  }
}
export function readAIConfig(provider?: AIProviderId) {
  const all = readAll();
  const selected = provider || all.provider;
  return { provider: selected, ...all.providers[selected] };
}
export function aiStatus() {
  const all = readAll(),
    current = all.providers[all.provider];
  return {
    provider: all.provider,
    configured: Boolean(current.apiKey),
    model: current.model,
    providers: Object.fromEntries(
      aiProviderIds.map((id) => [
        id,
        {
          configured: Boolean(all.providers[id].apiKey),
          model: all.providers[id].model,
        },
      ]),
    ) as Record<AIProviderId, { configured: boolean; model: string }>,
  };
}
export function saveAIConfig(input: {
  provider?: AIProviderId;
  apiKey?: string;
  model: string;
  removeKey?: boolean;
}) {
  const current = readAll(),
    provider = input.provider || current.provider;
  current.providers[provider] = entrySchema.parse({
    apiKey: input.removeKey
      ? ""
      : input.apiKey?.trim() || current.providers[provider].apiKey,
    model: input.model,
  });
  current.provider = provider;
  const next = schema.parse(current),
    file = configPath();
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  writeFileSync(temp, JSON.stringify(next), { mode: 0o600 });
  renameSync(temp, file);
  return aiStatus();
}
export async function availableAIModels(
  apiKey?: string,
  provider?: AIProviderId,
) {
  const config = readAIConfig(provider),
    key = apiKey?.trim() || config.apiKey;
  if (!key)
    throw new Error(`Sisesta ${aiProviders[config.provider].name} API-võti.`);
  try {
    const models: { id: string; name: string }[] = [];
    if (config.provider === "gemini") {
      const client = new GoogleGenAI({
        apiKey: key,
        httpOptions: { timeout: 20000 },
      });
      const pager = await client.models.list({ config: { pageSize: 100 } });
      for await (const model of pager) {
        const id = model.name?.replace(/^models\//, "");
        if (
          id?.startsWith("gemini-") &&
          model.supportedActions?.includes("generateContent") &&
          !/(image|tts|audio|live|embedding|robotics)/i.test(id)
        )
          models.push({ id, name: model.displayName || id });
        if (models.length >= 100) break;
      }
    } else if (config.provider === "groq" || config.provider === "mistral") {
      const isGroq = config.provider === "groq";
      const response = await fetch(isGroq ? "https://api.groq.com/openai/v1/models" : "https://api.mistral.ai/v1/models", {
        headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20000), redirect: "error",
      });
      if (!response.ok) throw new Error("models failed");
      const payload = z.object({ data: z.array(z.object({ id: z.string() })) }).parse(await response.json());
      for (const model of payload.data) {
        // Only models verified for this provider's document pipeline.
        if (isGroq ? model.id === "qwen/qwen3.8-27b" : /^mistral-ocr-/.test(model.id))
          models.push({ id: model.id, name: model.id });
      }
    } else {
      const isOpenAI = config.provider === "openai";
      const response = await fetch(
        isOpenAI
          ? "https://api.openai.com/v1/models"
          : "https://api.anthropic.com/v1/models?limit=100",
        {
          headers: isOpenAI
            ? { Authorization: `Bearer ${key}` }
            : { "x-api-key": key, "anthropic-version": "2023-06-01" },
          signal: AbortSignal.timeout(20000),
          redirect: "error",
        },
      );
      if (!response.ok) throw new Error("models failed");
      const payload = z
        .object({
          data: z.array(
            z.object({
              id: z.string(),
              display_name: z.string().optional(),
              capabilities: z
                .object({
                  image_input: z.object({ supported: z.boolean() }).optional(),
                  pdf_input: z.object({ supported: z.boolean() }).optional(),
                })
                .nullable()
                .optional(),
            }),
          ),
        })
        .parse(await response.json());
      for (const m of payload.data)
        if (
          isOpenAI
            ? /^gpt-(4\.1|4o|5|6)(-|$|\.)/.test(m.id) &&
              !/(audio|realtime|transcribe|tts|codex|search|image|pro)/i.test(
                m.id,
              )
            : /^claude-/.test(m.id) &&
              m.capabilities?.image_input?.supported !== false &&
              m.capabilities?.pdf_input?.supported !== false
        )
          models.push({ id: m.id, name: m.display_name || m.id });
    }
    if (!models.length) throw new Error("no models");
    return models.sort((a, b) => a.id.localeCompare(b.id));
  } catch {
    throw new Error(
      "Mudelite laadimine ebaõnnestus. Kontrolli valitud teenuse API-võtit, võrguühendust ja ligipääsu.",
    );
  }
}
