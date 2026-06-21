import type { LegalDocumentType } from '../../content/legal';

/**
 * A run of the Welcome legal footer: either plain text, or a tappable link to
 * one of the legal documents. Built by {@link buildLegalSegments}.
 */
export type LegalTextSegment =
  | { type: 'text'; value: string }
  | { type: LegalDocumentType; value: string };

/**
 * Split a full legal sentence into plain-text + linkified runs by locating the
 * "Terms of Service" and "Privacy Policy" substrings inside it. Locale-agnostic
 * (works for en/vi/fr) because each locale's `legal_text` contains both
 * localised link substrings verbatim — we match on the substring, not on a
 * fixed English phrase.
 *
 * If a link substring isn't found (defensive), the function degrades to plain
 * text for that portion rather than dropping characters.
 */
export const buildLegalSegments = (
  fullText: string,
  termsLabel: string,
  privacyLabel: string,
): LegalTextSegment[] => {
  const links: Array<{
    type: LegalDocumentType;
    index: number;
    value: string;
  }> = [];

  const termsIndex = fullText.indexOf(termsLabel);
  if (termsLabel && termsIndex !== -1) {
    links.push({ type: 'terms', index: termsIndex, value: termsLabel });
  }
  const privacyIndex = fullText.indexOf(privacyLabel);
  if (privacyLabel && privacyIndex !== -1) {
    links.push({ type: 'privacy', index: privacyIndex, value: privacyLabel });
  }

  // No recognisable links → the whole sentence is plain text.
  if (links.length === 0) {
    return [{ type: 'text', value: fullText }];
  }

  links.sort((a, b) => a.index - b.index);

  const segments: LegalTextSegment[] = [];
  let cursor = 0;
  for (const link of links) {
    if (link.index > cursor) {
      segments.push({
        type: 'text',
        value: fullText.slice(cursor, link.index),
      });
    }
    segments.push({ type: link.type, value: link.value });
    cursor = link.index + link.value.length;
  }
  if (cursor < fullText.length) {
    segments.push({ type: 'text', value: fullText.slice(cursor) });
  }
  return segments;
};
