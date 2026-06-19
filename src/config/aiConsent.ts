// AI data-sharing consent configuration.
//
// App Store blocker B1 (Guideline 5.1.1/5.1.2): before the user's body/selfie
// photos are first sent to our AI providers (Google Gemini + OpenAI) to
// generate a try-on result, the user must give explicit, informed consent.
//
// The decision is persisted under the key below (mirrors the analytics-consent
// pattern in config/analytics.ts). Versioned so a future policy change can
// force a fresh prompt by bumping the suffix.
export const AI_DATA_SHARING_CONSENT_KEY = 'auxi.ai.dataSharing.consent.v1';

// The AI recipients named in the consent prompt + Privacy Policy §3. Kept here
// so the disclosure copy and any audit reference a single source of truth.
export const AI_PROVIDER_NAMES = 'Google, OpenAI';

// Support inbox for the "Report" affordance on AI-generated content (B2).
export const AI_REPORT_EMAIL = 'marketing@macgie.com';
