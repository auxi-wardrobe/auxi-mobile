/**
 * AU-242 Phase 04 Integration — Shared password rules.
 *
 * Both `PasswordCreationScreen` (batch B / spec 04+05) and
 * `ResetNewPasswordScreen` (batch D / spec 12) validate against the
 * same 3-rule policy. We keep one source of truth here to prevent
 * silent drift if backend tightens the policy or marketing wants to
 * relax it.
 *
 * Rules (frontend mirror of backend `app/security/password.py`):
 *   1. ≥ {@link PASSWORD_MIN_LENGTH} characters
 *   2. Contains at least one lowercase letter [a-z]
 *   3. Contains at least one digit [0-9]
 *
 * NB: criteria copy is i18n'd at render time — we only return the
 * boolean evaluation here. The screen-specific i18n key prefix is
 * passed in by the caller via {@link buildCriteriaList}.
 */
export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordCriteria {
  /** ≥ {@link PASSWORD_MIN_LENGTH} chars */
  length: boolean;
  /** at least one lowercase letter */
  lowercase: boolean;
  /** at least one digit */
  digit: boolean;
}

export interface PasswordValidation {
  isValid: boolean;
  criteria: PasswordCriteria;
}

/**
 * Pure evaluator. Returns the 3 booleans + an overall `isValid` flag
 * for ergonomic destructuring at call sites.
 */
export const validatePassword = (password: string): PasswordValidation => {
  const criteria: PasswordCriteria = {
    length: password.length >= PASSWORD_MIN_LENGTH,
    lowercase: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
  };
  return {
    isValid: criteria.length && criteria.lowercase && criteria.digit,
    criteria,
  };
};

/**
 * Stable rule-key identifiers used by tests + render keys.
 * Order is the order rendered in the checklist (spec 04 §4).
 */
export type PasswordRuleKey = 'length' | 'lowercase' | 'digit';

export interface PasswordRuleDescriptor {
  key: PasswordRuleKey;
  /** i18n key (already-resolved string from the caller's `t(...)` call) */
  label: string;
  /** whether the current password satisfies this rule */
  satisfied: boolean;
}

/**
 * Builds the display-ready list of criteria for the checklist UI.
 * The caller resolves i18n strings (the labels diverge by screen — the
 * sign-up screen uses `uac.password_creation.*` and the reset screen
 * uses `uac.reset_new_password.*`, but the rule values are identical).
 */
export const buildCriteriaList = (
  password: string,
  labels: Record<PasswordRuleKey, string>,
): PasswordRuleDescriptor[] => {
  const { criteria } = validatePassword(password);
  return [
    { key: 'length', label: labels.length, satisfied: criteria.length },
    { key: 'lowercase', label: labels.lowercase, satisfied: criteria.lowercase },
    { key: 'digit', label: labels.digit, satisfied: criteria.digit },
  ];
};
