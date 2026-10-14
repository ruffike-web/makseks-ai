import { expect, it } from "vitest";
import { defaultSettings, settingsSchema } from "../src/lib/domain";
import {
  createExtractionProvider,
  OpenAIProvider,
  ClaudeProvider,
  GeminiProvider,
} from "../src/lib/extraction";
it("legacy consent is only for Gemini and provider identity persists in settings", () => {
  const legacy = { ...defaultSettings(), aiEnabled: true };
  const withoutProvider: Partial<typeof legacy> = { ...legacy };
  delete withoutProvider.aiConsentProvider;
  expect(settingsSchema.parse(withoutProvider).aiConsentProvider).toBe(
    "gemini",
  );
  expect(
    settingsSchema.parse({ ...legacy, aiConsentProvider: "anthropic" })
      .aiConsentProvider,
  ).toBe("anthropic");
  expect(
    settingsSchema.safeParse({ ...legacy, aiConsentProvider: "unknown" })
      .success,
  ).toBe(false);
});
it("pins extraction to the consented provider instead of re-reading global selection", () => {
  expect(createExtractionProvider("gemini")).toBeInstanceOf(GeminiProvider);
  expect(createExtractionProvider("openai")).toBeInstanceOf(OpenAIProvider);
  expect(createExtractionProvider("anthropic")).toBeInstanceOf(ClaudeProvider);
});
