import type { AIProviderId } from "./ai-providers";
import type { Settings } from "./domain";

type Consent = Pick<Settings, "aiEnabled" | "aiConsentProvider">;

/**
 * Returns the provider that may receive this company's invoice data, or null.
 * Data may only go to the configured provider the company explicitly approved.
 */
export function consentedExtractionProvider(
  settings: Consent,
  ai: { configured: boolean; provider: AIProviderId },
): AIProviderId | null {
  return settings.aiEnabled &&
    ai.configured &&
    settings.aiConsentProvider === ai.provider
    ? ai.provider
    : null;
}

/** A settings save may not enable AI for a provider other than the active one. */
export function consentMatchesProvider(
  settings: Consent,
  activeProvider: AIProviderId,
): boolean {
  return !settings.aiEnabled || settings.aiConsentProvider === activeProvider;
}
