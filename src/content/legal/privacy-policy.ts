import type { LegalDocument } from './types';

/**
 * Macgie Privacy Policy.
 *
 * ⚠️ PENDING-CEO-APPROVAL DRAFT — not yet legally reviewed. Source:
 * `plans/260619-1150-appstore-legal-docs/privacy-policy-draft.md` ("## Macgie
 * Privacy Policy" body, subsections 1–11). Wording, legal entity name,
 * jurisdiction, contact email, and effective date are subject to change once
 * the CEO/legal sign off. This module is intentionally a swappable single
 * source of truth: when the final text lands, replace the prose here and flip
 * `effectiveDate` — no screen changes needed.
 *
 * English-only by design (see ./types.ts). Placeholders ([LEGAL ENTITY NAME],
 * [JURISDICTION]) are carried through verbatim from the draft so they remain
 * obvious until filled.
 */
export const privacyPolicy: LegalDocument = {
  title: 'Macgie Privacy Policy',
  // Draft: effective date is set on publish (CEO/legal step).
  effectiveDate: '(to be set on publish)',
  sections: [
    {
      paragraphs: [
        'This Privacy Policy explains how Macgie (“Macgie”, “we”, “us”) collects, uses, shares, and protects your information when you use the Macgie mobile application and related services (the “Service”). By using Macgie, you agree to the practices described here. If you do not agree, please do not use the Service.',
        'This Privacy Policy works together with our Terms of Service.',
      ],
    },
    {
      heading: '1. Information We Collect',
      paragraphs: [
        'We collect only what we need to run the Service:',
        'Account information',
      ],
      bullets: [
        'Email address and basic profile details, obtained when you sign in with Apple or Google.',
      ],
    },
    {
      paragraphs: ['Photos and images you provide'],
      bullets: [
        'Photos of your clothing and wardrobe items.',
        'Photos of yourself — including selfies and full-body photos — that you upload to use the virtual try-on and styling features.',
      ],
    },
    {
      paragraphs: ['Style and wardrobe data'],
      bullets: [
        'Body-shape and fit preferences you select, wardrobe item categories, tags, notes, outfit history, and your interactions with recommendations.',
      ],
    },
    {
      paragraphs: ['Approximate location'],
      bullets: [
        'Coarse location, used to fetch local weather so recommendations suit the conditions. We do not track precise or background location for advertising.',
      ],
    },
    {
      paragraphs: ['Usage and analytics'],
      bullets: [
        'Product-interaction events (screens viewed, features used) collected via Mixpanel, only after you opt in to analytics. Analytics data is stored with EU data residency. We configure analytics to avoid IP-based geolocation and to use internal identifiers only — not your email, phone, or social handle.',
      ],
    },
    {
      paragraphs: ['Device and diagnostic data'],
      bullets: [
        'Crash and error diagnostics via Sentry, configured to exclude personally identifying information.',
      ],
    },
    {
      heading: '2. How We Use Your Information',
      paragraphs: ['We use your information to:'],
      bullets: [
        'create and secure your account;',
        'generate AI styling recommendations and virtual try-on images;',
        'personalize suggestions based on your wardrobe, preferences, weather, and usage;',
        'maintain, debug, and improve the Service;',
        'communicate important service or policy updates.',
      ],
    },
    {
      heading: '3. AI Processing and Third-Party AI Providers — important',
      paragraphs: [
        'To generate outfit recommendations and virtual try-on images, Macgie sends relevant data — including your wardrobe photos and the body/selfie photos you upload — to third-party artificial-intelligence providers that process them on our behalf:',
      ],
      bullets: [
        'Google (Gemini) — generates virtual try-on images and styling analysis.',
        'OpenAI — generates outfit reasoning and recommendations.',
      ],
    },
    {
      paragraphs: [
        'These providers process your photos and related data solely to return a result to you. Their handling of data is also governed by their own terms and privacy policies. We ask for your explicit consent before your photos are sent to these AI providers, and you can decline. If you decline, AI try-on and AI-generated recommendation features will be unavailable, but the rest of the app remains usable.',
        'AI-generated content is provided for inspiration and may be inaccurate; see the Terms of Service.',
      ],
    },
    {
      heading: '4. How We Share Information',
      paragraphs: ['We share information only as described here:'],
      bullets: [
        'AI providers — as described in Section 3 (Google Gemini, OpenAI).',
        'Login providers — Apple and Google, to authenticate you.',
        'Analytics — Mixpanel (EU residency), only with analytics consent.',
        'Diagnostics — Sentry, for crash reporting (no PII).',
        'Infrastructure — our hosting provider (Railway) stores app data to operate the Service.',
      ],
    },
    {
      paragraphs: [
        'We do not sell your personal data, and we do not share your wardrobe or body data with advertisers. We may disclose information if required by law or to protect the rights and safety of users and the Service.',
      ],
    },
    {
      heading: '5. Data Retention',
      paragraphs: [
        'We keep your information for as long as your account is active or as needed to provide the Service. When you delete content or your account, we remove the associated data, subject to reasonable technical limitations and standard backup-retention periods. Aggregated or de-identified data that can no longer identify you may be retained.',
      ],
    },
    {
      heading: '6. Your Rights and Choices',
      bullets: [
        'Access / correction — view and edit your profile and wardrobe in-app.',
        'Deletion — delete individual items or your entire account; account deletion removes your associated personal data subject to Section 5.',
        'Withdraw AI consent — stop using AI features at any time; you can revoke the AI-data-sharing consent.',
        'Analytics opt-out — analytics is opt-in; you can opt out in settings, and Mixpanel stays inert until you consent.',
      ],
      paragraphs: ['To exercise any right, contact us (Section 11).'],
    },
    {
      heading: '7. Data Security',
      paragraphs: [
        'We protect your data with encryption in transit (HTTPS/TLS), secure credential storage on-device (iOS Keychain), and access controls on our backend. No method of transmission or storage is completely secure, but we work to protect your information using industry-standard measures.',
      ],
    },
    {
      heading: '8. International Data Transfers',
      paragraphs: [
        'Your data may be processed in countries other than where you live. Analytics data is stored with EU data residency; our AI providers (Google, OpenAI) may process data in the United States or other regions. Where required, we rely on appropriate safeguards for such transfers.',
      ],
    },
    {
      heading: '9. Children’s Privacy',
      paragraphs: [
        'Macgie is not directed to children under 13. We do not knowingly collect personal data from children under 13. If you are under the age required by your local laws to consent to digital services, use Macgie only with parental or guardian permission. If you believe a child has provided us data, contact us and we will delete it.',
      ],
    },
    {
      heading: '10. Changes to This Policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time. For material changes, we will notify you in the app or by other reasonable means. Continued use after an update means you accept the revised Policy.',
      ],
    },
    {
      heading: '11. Contact',
      paragraphs: [
        'Questions about this Privacy Policy or your data:',
        'marketing@macgie.com',
        'Macgie is operated by [LEGAL ENTITY NAME], [JURISDICTION].',
      ],
    },
  ],
};
