// AI data-sharing consent seam — App Store blocker B1 (Guideline 5.1.1/5.1.2).
//
// Single source of truth for whether the user has agreed to send their
// body/selfie + wardrobe photos to our AI providers (Google Gemini + OpenAI)
// to generate a try-on result. The try-on photo-upload call sites read this
// before sending; nothing is sent unless consent is granted.
//
// Mirrors the analytics-consent pattern (services/analytics.ts): a persisted
// AsyncStorage flag plus grant/revoke helpers. The Settings "AI data sharing"
// toggle revokes; the next AI action re-prompts (Privacy Policy §6).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_DATA_SHARING_CONSENT_KEY } from '../config/aiConsent';
import { track } from './analytics';

/** Whether the user has granted AI data-sharing consent (persisted). */
export const hasAiDataSharingConsent = async (): Promise<boolean> => {
  try {
    return (
      (await AsyncStorage.getItem(AI_DATA_SHARING_CONSENT_KEY)) === 'granted'
    );
  } catch {
    // Fail closed: if storage is unreadable, treat as not-consented so we
    // never send photos on an unverifiable decision.
    return false;
  }
};

/** Persist consent and emit the analytics event. */
export const grantAiDataSharingConsent = async (): Promise<void> => {
  await AsyncStorage.setItem(AI_DATA_SHARING_CONSENT_KEY, 'granted');
  track('ai_consent_granted');
};

/** User declined the prompt. Persist 'declined' and emit the event. */
export const declineAiDataSharingConsent = async (): Promise<void> => {
  await AsyncStorage.setItem(AI_DATA_SHARING_CONSENT_KEY, 'declined');
  track('ai_consent_declined');
};

/**
 * Revoke a previously-granted consent (Settings toggle, Privacy Policy §6).
 * The next AI photo action re-prompts because hasAiDataSharingConsent() now
 * returns false.
 */
export const revokeAiDataSharingConsent = async (): Promise<void> => {
  await AsyncStorage.setItem(AI_DATA_SHARING_CONSENT_KEY, 'declined');
  track('ai_consent_revoked');
};
