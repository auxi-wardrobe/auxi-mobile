import type { UacEmailInputMode } from '../../types/navigation';
import type { EmailPrecheckResponse } from '../../services/authTypes';

export type EmailInputRouteDecision =
  | { kind: 'email-provider-notice' }
  | { kind: 'password-creation' }
  | { kind: 'sign-in' }
  | { kind: 'unknown-signin-email' };

const isOAuthProvider = (
  provider: EmailPrecheckResponse['provider'],
): provider is 'google' | 'apple' =>
  provider === 'google' || provider === 'apple';

export const resolveEmailInputRoute = (
  mode: UacEmailInputMode,
  provider: EmailPrecheckResponse['provider'],
): EmailInputRouteDecision => {
  if (isOAuthProvider(provider)) return { kind: 'email-provider-notice' };
  if (mode === 'signin' && provider === 'none') {
    return { kind: 'unknown-signin-email' };
  }
  if (mode === 'signup' && provider === 'none') {
    return { kind: 'password-creation' };
  }
  return { kind: 'sign-in' };
};
