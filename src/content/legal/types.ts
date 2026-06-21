/**
 * Shared structure for in-app legal documents (Terms of Service, Privacy
 * Policy). Rendered by `screens/legal/LegalDocumentScreen.tsx`.
 *
 * Legal body text is kept in ENGLISH ONLY — it is a single source of truth and
 * must NOT be machine-translated. Translating legal text is a future legal
 * decision (needs counsel sign-off), not a dev-time i18n lift. The screen
 * *chrome* (header title, back button) IS localised via i18n; only the
 * document body stays English.
 */

/** One section of a legal document: a heading plus its prose/bulleted body. */
export interface LegalSection {
  /** Section heading, e.g. "1. About Macgie". Optional for the intro block. */
  heading?: string;
  /** Standalone paragraphs rendered in order. */
  paragraphs?: string[];
  /** Bulleted list items rendered after the paragraphs. */
  bullets?: string[];
}

/** A complete legal document. */
export interface LegalDocument {
  /** Document title, e.g. "Macgie Terms of Service". */
  title: string;
  /** Human-readable effective date, e.g. "May 29, 2026". */
  effectiveDate: string;
  /** Ordered sections. */
  sections: LegalSection[];
}

/** Discriminator used by the screen route param + analytics. */
export type LegalDocumentType = 'terms' | 'privacy';
