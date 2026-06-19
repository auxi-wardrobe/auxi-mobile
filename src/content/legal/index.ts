import type { LegalDocument, LegalDocumentType } from './types';
import { termsOfService } from './terms-of-service';
import { privacyPolicy } from './privacy-policy';

export type { LegalDocument, LegalSection, LegalDocumentType } from './types';
export { termsOfService } from './terms-of-service';
export { privacyPolicy } from './privacy-policy';

/** Resolve the document body for a given route param / analytics discriminator. */
export const getLegalDocument = (type: LegalDocumentType): LegalDocument =>
  type === 'terms' ? termsOfService : privacyPolicy;
