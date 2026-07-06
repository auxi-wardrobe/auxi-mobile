/**
 * Web-only helpers for the admin-impersonation `?token=` param. The app reads
 * an access-only user JWT from the URL, seeds an ephemeral session, and strips
 * the param so it does not linger in history / on copy.
 */
export const TOKEN_PARAM = 'token';

export const parseTokenParam = (search: string): string | null => {
  try {
    const v = new URLSearchParams(search).get(TOKEN_PARAM);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
};

/** Remove `?token=` from the current URL without a reload (keeps other params). */
export const stripTokenFromUrl = (): void => {
  if (typeof location === 'undefined' || typeof history === 'undefined') return;
  const qs = new URLSearchParams(location.search);
  if (!qs.has(TOKEN_PARAM)) return;
  qs.delete(TOKEN_PARAM);
  const q = qs.toString();
  history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
};
