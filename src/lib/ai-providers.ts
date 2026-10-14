export const aiProviders = {
  gemini: { name: "Google Gemini", defaultModel: "gemini-3.8-flash" },
  openai: { name: "OpenAI (ChatGPT mudelid)", defaultModel: "gpt-6.1-sol" },
  anthropic: { name: "Anthropic Claude", defaultModel: "claude-sonnet-5-5" },
  groq: { name: "Groq", defaultModel: "qwen/qwen3.8-27b" },
  mistral: { name: "Mistral Document AI", defaultModel: "mistral-ocr-latest" },
} as const;
export type AIProviderId = keyof typeof aiProviders;
export const aiProviderIds = ["gemini", "openai", "anthropic", "groq", "mistral"] as const;

// Official model catalogs checked 2026-10-09. Account access is checked separately.
export const suggestedAIModels: Record<AIProviderId, { id: string; name: string }[]> = {
  groq: [{ id: "qwen/qwen3.8-27b", name: "Qwen 3.8 27B (pildid ja PDF kuni 3 lk)" }],
  mistral: [{ id: "mistral-ocr-latest", name: "Mistral OCR / Document AI" }],
  gemini: [{ id: "gemini-3.8-flash", name: "Gemini 3.8 Flash" }],
  openai: [
    { id: "gpt-6.1-sol", name: "GPT-6.1 Sol" },
    { id: "gpt-6-luna", name: "GPT-6 Luna" },
    { id: "gpt-6-astra", name: "GPT-6 Astra" },
  ],
  anthropic: [
    { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5" },
    { id: "claude-haiku-5-5", name: "Claude Haiku 5.5" },
    { id: "claude-opus-5-5", name: "Claude Opus 5.5" },
    { id: "claude-fable-5-1", name: "Claude Fable 5.1" },
  ],
};
