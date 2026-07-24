import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from 'react';
import * as Sentry from '@sentry/react-native';
import { toast } from '../components/design-system/lib';
import { authService } from '../services/auth';
import { migrateLegacyKeychain } from '../services/tokenStorage';
import { registerSessionExpiredListener } from '../services/apiClient';
import { wasAuthDeepLinkRecentlySeen } from '../services/deepLinkHandler';
import { identifyUser, resetAnalytics, track } from '../services/analytics';
import {
  registerDeviceForPush,
  unregisterDevice,
} from '../services/notificationService';
import { getForcedFirstLogin } from '../services/reviewOverrides';
import { resetV05Session } from '../services/v05Api';
import { setRecommendationMemoryUser } from '../services/recommendationMemory';
import { setTryOnResultUser } from '../services/tryOnResultStore';
import {
  configureRevenueCat,
  logInRevenueCat,
  logOutRevenueCat,
} from '../services/revenueCat';
import { LoginRequest, RegisterRequest, User } from '../types/auth';

/**
 * The auth method that produced the current/upcoming session. Used as a
 * tracking-only signal so the identity effect can tag `sign_in_completed`
 * / `oauth_sign_in_completed` / `sign_up_completed` with the real path
 * the user took. Not persisted; cleared after the event fires.
 */
export type AuthMethod = 'email' | 'google' | 'apple';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  /**
   * Email of the account that just registered and is awaiting
   * verification. Read by VerifyEmail / SignIn screens to pre-fill
   * the address without leaking it across logout boundaries.
   * Cleared on verify-success or logout.
   */
  pendingVerifyEmail: string | null;
  login: (data: LoginRequest) => Promise<void>;
  /**
   * Register and stop. Per AU-242, register no longer auto-logs in —
   * the user must verify their email via the magic link first. The
   * caller is responsible for navigating to VerifyEmail with the
   * email in route params.
   */
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  updateCurrentUser: (data: Partial<User>) => Promise<User>;
  /**
   * Optimistically flip the in-memory user to premium for instant post-purchase
   * UX. This does NOT persist to the backend — the RevenueCat webhook is the
   * durable authority for `is_premium`; a subsequent `refreshUser()` reconciles
   * with server truth. No-op when there is no current user.
   */
  markPremiumOptimistic: () => void;
  resetUserPreferences: () => Promise<User>;
  checkAuth: () => Promise<void>;
  completeOnboarding: (data?: Partial<User>) => Promise<void>;
  /** Explicit setter so screens can pre-seed without going through register. */
  setPendingVerifyEmail: (email: string | null) => void;
  /**
   * Flag the upcoming identity transition as an OAuth sign-in. The
   * identity effect reads this on the next `user` change and emits
   * `oauth_sign_in_completed` + a `method`-tagged `sign_in_completed`
   * instead of the email-default. Cleared after firing.
   */
  markOAuthSignIn: (provider: 'google' | 'apple') => void;
  /**
   * Flag the upcoming identity transition as a fresh sign-in from a
   * screen that drives the login mutation directly (e.g. SignInScreen,
   * which uses `useLoginMutation` + `refreshUser` rather than
   * AuthContext.login). The identity effect emits `sign_in_completed`
   * with the supplied `method`. Cleared after firing.
   */
  markSignInCompletion: (method: AuthMethod) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string | null>(
    null,
  );
  // Guard so the session-expired toast doesn't fire repeatedly when
  // multiple in-flight 401s land at the same instant.
  const sessionExpiredFiredRef = useRef(false);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const userData = await authService.getCurrentUser();
    // Web-review sandbox only: when a shared link requests an onboarding
    // screen, force is_first_login so AppNavigator mounts the onboarding
    // stack. The override flag is only ever set from the web entry
    // (index.web.tsx), so this is a no-op on native / in production.
    const resolved =
      userData && getForcedFirstLogin()
        ? { ...userData, is_first_login: true }
        : userData;
    setUser(resolved);
    return resolved;
  }, []);

  const updateCurrentUser = useCallback(
    async (data: Partial<User>): Promise<User> => {
      const updatedUser = await authService.updateUser(data);
      setUser(updatedUser);
      return updatedUser;
    },
    [],
  );

  const markPremiumOptimistic = useCallback((): void => {
    setUser(prev =>
      prev && !prev.is_premium ? { ...prev, is_premium: true } : prev,
    );
  }, []);

  const resetUserPreferences = useCallback(async (): Promise<User> => {
    const updatedUser = await authService.resetPreferences();
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      // One-time upgrade for users coming from legacy single-entry Keychain.
      // Idempotent — safe to call on every cold start. Must run BEFORE
      // isAuthenticated() so the new layout is populated.
      await migrateLegacyKeychain();
      const isAuthenticated = await authService.isAuthenticated();
      if (isAuthenticated) {
        await refreshUser();
      } else {
        setUser(null);
      }
    } catch (error) {
      console.log('Auth check failed', error);
      // refreshUser() → getCurrentUser() now goes through apiClient, which
      // silently refreshes on a 401 and replays the request. If we still land
      // here, distinguish a definitive auth rejection from a transient blip:
      //
      //   - Definitive expiry (refresh token itself rejected, or none stored):
      //     the apiClient interceptor has ALREADY cleared the tokens and fired
      //     the session-expired listener. authService.isAuthenticated() now
      //     reports false → reflect the signed-out state.
      //
      //   - Transient failure (offline / timeout / 5xx): tokens are still
      //     valid and were left intact. We must NOT wipe them — keep the
      //     stored session so the user is restored on the next retry / when
      //     back online, instead of being bounced to login.
      //
      // Crucially we NEVER call authService.logout() here: destroying a
      // still-valid session on a transient error is exactly the ~hourly
      // forced-logout bug this fix removes.
      try {
        const stillAuthenticated = await authService.isAuthenticated();
        if (!stillAuthenticated) {
          setUser(null);
        }
      } catch (storageError) {
        console.warn('Auth check storage probe failed', storageError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    // Bring the RevenueCat SDK up once on app start (anonymous). No-op until a
    // key is provisioned + on non-iOS; logInRevenueCat below aliases it to our
    // user id on the next identity transition. Safe/dark by default.
    configureRevenueCat();
    checkAuth();
  }, [checkAuth]);

  // Wire the session-expired hook from apiClient. When the 401-retry
  // interceptor exhausts the refresh path (refresh token missing /
  // rejected), it fires this listener so AuthContext can drop
  // in-memory state and surface a toast. Navigation lands the user
  // back on the auth stack via AppNavigator's `user` gate.
  useEffect(() => {
    const unregister = registerSessionExpiredListener(() => {
      if (sessionExpiredFiredRef.current) return;
      sessionExpiredFiredRef.current = true;
      setUser(null);
      setPendingVerifyEmail(null);
      // A reset-password/verify-email deep link just landed the user on its
      // screen — they already know they're signed out; the toast would only
      // add confusing noise mid account-recovery. The session is still
      // cleared above regardless.
      if (!wasAuthDeepLinkRecentlySeen()) {
        toast.show({
          type: 'error',
          text1: 'Session expired',
          text2: 'Please sign in again.',
        });
      }
      // Reset the guard after a short window so a subsequent
      // expiry (e.g. after re-login + another long idle) is
      // surfaced cleanly.
      setTimeout(() => {
        sessionExpiredFiredRef.current = false;
      }, 5000);
    });
    return unregister;
  }, []);

  // Set by login() so the identity effect can emit `sign_in_completed`
  // AFTER identify() lands (correct attribution) and only for explicit
  // logins — not cold-start restores.
  const justLoggedInRef = useRef(false);
  // Method that produced the upcoming identity transition. Defaults
  // to 'email' (the password path) when login() runs; OAuth screens
  // override via markOAuthSignIn(). Read once by the identity effect.
  const pendingAuthMethodRef = useRef<AuthMethod>('email');

  const markOAuthSignIn = useCallback((provider: 'google' | 'apple') => {
    justLoggedInRef.current = true;
    pendingAuthMethodRef.current = provider;
  }, []);
  const markSignInCompletion = useCallback((method: AuthMethod) => {
    justLoggedInRef.current = true;
    pendingAuthMethodRef.current = method;
  }, []);

  // Analytics identity. identify() when a user is present (login,
  // cold-start restore, post-verify); reset() when they leave (logout /
  // session expiry). The ref guard means we only fire on real identity
  // transitions, not on every render.
  const analyticsIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (user) {
      const distinctId = String(user.id);
      if (analyticsIdRef.current === distinctId) return;
      analyticsIdRef.current = distinctId;
      // Point long-term recommendation memory at this user (hydrates their
      // persisted last-5 signatures from disk) on every real identity change.
      setRecommendationMemoryUser(distinctId);
      // Point the See-this-on-me result cache at this user (hydrates their
      // persisted last-successful try-on results so re-tapping "See on me"
      // shows the previous AI photo instead of regenerating).
      setTryOnResultUser(distinctId);
      // People profile — full user attributes (incl. reserved $email/$created).
      const profile: Record<string, unknown> = {
        $email: user.email,
        $created: user.created_at,
        user_id: user.id,
      };
      if (user.role) {
        profile.role = user.role;
      }
      if (user.gender) {
        profile.gender = user.gender;
      }
      if (user.user_metadata?.style_direction) {
        profile.style_direction = user.user_metadata.style_direction;
      }
      if (user.user_metadata?.confidence_level) {
        profile.confidence_level = user.user_metadata.confidence_level;
      }
      if (user.user_metadata?.display_state) {
        profile.display_state = user.user_metadata.display_state;
      }
      // Super properties — non-PII user dimensions that tag EVERY event for
      // segmentation (no email here; that stays on the People profile only).
      const superProps: Record<string, unknown> = { user_id: user.id };
      if (user.gender) {
        superProps.gender = user.gender;
      }
      if (user.user_metadata?.style_direction) {
        superProps.style_direction = user.user_metadata.style_direction;
      }
      if (user.user_metadata?.confidence_level) {
        superProps.confidence_level = user.user_metadata.confidence_level;
      }
      if (user.user_metadata?.display_state) {
        superProps.display_state = user.user_metadata.display_state;
      }
      identifyUser(distinctId, profile, superProps);
      // Alias RevenueCat's app_user_id to our user id so the backend webhook
      // (which keys on app_user_id) attributes purchases to this account. Fires
      // on the same transitions as analytics identify (login, cold-start
      // restore, post-verify). No-op until RC is configured; never throws.
      logInRevenueCat(distinctId);
      // Key Unleash rollouts on the same identity as analytics, so % rollouts
      // and role/gender targeting are stable per logged-in user. Fires on the
      // same transitions: login, cold-start restore, post-verify.
      if (justLoggedInRef.current) {
        justLoggedInRef.current = false;
        const method = pendingAuthMethodRef.current;
        // OAuth completion is its own event so the funnel can pair it
        // with `oauth_sign_in_started`. The base `sign_in_completed`
        // still fires (with the real method) so existing dashboards
        // keep working.
        if (method === 'google' || method === 'apple') {
          track('oauth_sign_in_completed', { provider: method });
        }
        track('sign_in_completed', { method });
        // Push: request permission + register the FCM device token now that the
        // user is authenticated (contextual, post-login — never cold on launch).
        // Fire-and-forget; the service never throws.
        registerDeviceForPush();
        // Reset to default for the next transition (cold-start
        // restores remain silent because justLoggedInRef stays false).
        pendingAuthMethodRef.current = 'email';
      }
    } else if (analyticsIdRef.current !== null) {
      analyticsIdRef.current = null;
      resetAnalytics();
      // Reset RevenueCat identity to a fresh anonymous id so the next user
      // isn't merged into this user's entitlements. No-op until configured.
      logOutRevenueCat();
      // User left (logout / session expiry): drop the in-memory recommendation
      // memory and the cached V05 session so neither outlives the user it
      // belongs to (the per-user persisted memory blob stays for re-login).
      setRecommendationMemoryUser(null);
      // Drop the in-memory try-on result cache too (the per-user persisted blob
      // stays for re-login, matching the recommendation memory).
      setTryOnResultUser(null);
      resetV05Session();
    }
  }, [user]);

  const login = useCallback(
    async (data: LoginRequest) => {
      setIsLoading(true);
      try {
        await authService.login(data);
        // Manual login clears any stale verify-email handoff.
        setPendingVerifyEmail(null);
        // Flag the fresh sign-in so the identity effect emits
        // `sign_in_completed` after identify() lands. Signup completion
        // is tracked at onboarding completion, not here.
        justLoggedInRef.current = true;
        await checkAuth(); // Fetch user details after login
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [checkAuth],
  );

  /**
   * AU-242: register does NOT auto-login. Backend returns
   * `verification_required: true` and no tokens; the screen
   * navigates to VerifyEmail with the email in route params. We
   * stash it here too so the user can refresh / cold-start without
   * losing the handoff.
   */
  const register = useCallback(async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      await authService.register(data);
      setPendingVerifyEmail(data.email);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      // Remove this device's push token before clearing the session (the
      // DELETE is Bearer-authed — must run while tokens are still valid).
      await unregisterDevice();
      await authService.logout();
      setUser(null);
      setPendingVerifyEmail(null);
    } catch (error) {
      console.error(error);
      // Kept even though authService.logout() also reports its own failures
      // (feature: 'auth') — this catch is the ONLY capture point for
      // unregisterDevice() (services/notificationService.ts has no Sentry
      // coverage of its own), so removing it would reopen that gap.
      Sentry.captureException(error, { tags: { feature: 'logout' } });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeOnboarding = useCallback(
    async (data?: Partial<User>) => {
      if (!user) return;
      setIsLoading(true);
      try {
        const updateData = { ...data, is_first_login: false };
        await updateCurrentUser(updateData);
      } catch (error) {
        console.error('Failed to complete onboarding', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [updateCurrentUser, user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        pendingVerifyEmail,
        login,
        register,
        logout,
        refreshUser,
        updateCurrentUser,
        markPremiumOptimistic,
        resetUserPreferences,
        checkAuth,
        completeOnboarding,
        setPendingVerifyEmail,
        markOAuthSignIn,
        markSignInCompletion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
