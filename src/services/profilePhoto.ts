// Locally-cached profile photo (Google avatar).
//
// The backend user record has no photo field and `user_metadata` rejects
// unknown keys with a 422, so the Google profile picture can only live
// client-side. The OAuth screens capture the photo URL from the Google
// Sign-In SDK response at sign-in time and mirror it here; the Settings
// profile header reads it back for display.
//
// Privacy: the blob is keyed by (lowercased) account email, so one account
// can never read another's photo. Logout intentionally LEAVES the entry on
// disk — same pattern as `recommendationMemory` — so the same user keeps
// their avatar on re-login without a fresh Google round-trip.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@auxi/profile-photo/';

const storageKeyFor = (email: string): string =>
  `${KEY_PREFIX}${email.trim().toLowerCase()}`;

/** Fire-and-forget mirror to disk. A failed write just means the avatar
 *  falls back to initials — never worth surfacing or blocking on. */
export const saveProfilePhoto = (email: string, url: string): void => {
  if (!email.trim() || !url) {
    return;
  }
  AsyncStorage.setItem(storageKeyFor(email), url).catch(() => {});
};

/** Cached photo URL for this account, or null when none was ever captured
 *  (email/password accounts, pre-capture Google sessions, storage errors). */
export const getProfilePhoto = async (email: string): Promise<string | null> => {
  if (!email.trim()) {
    return null;
  }
  try {
    return await AsyncStorage.getItem(storageKeyFor(email));
  } catch {
    return null;
  }
};
