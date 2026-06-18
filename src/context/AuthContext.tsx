import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from 'react';
import Toast from 'react-native-toast-message';
import { authService } from '../services/auth';
import { migrateLegacyKeychain } from '../services/tokenStorage';
import { registerSessionExpiredListener } from '../services/apiClient';
import { identifyUser, resetAnalytics, track } from '../services/analytics';
import { identifyFlagUser, resetFlagUser } from '../services/feature-flags';
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
    setUser(userData);
    return userData;
  }, []);

  const updateCurrentUser = useCallback(
    async (data: Partial<User>): Promise<User> => {
      const updatedUser = await authService.updateUser(data);
      setUser(updatedUser);
      return updatedUser;
    },
    [],
  );

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
      // Token might be invalid
      try {
        await authService.logout();
      } catch (logoutError) {
        console.warn('Logout failed during auth check cleanup', logoutError);
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser]);

  useEffect(() => {
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
      Toast.show({
        type: 'error',
        text1: 'Session expired',
        text2: 'Please sign in again.',
      });
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
      // Key Unleash rollouts on the same identity as analytics, so % rollouts
      // and role/gender targeting are stable per logged-in user.
      identifyFlagUser(user);
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
        // Reset to default for the next transition (cold-start
        // restores remain silent because justLoggedInRef stays false).
        pendingAuthMethodRef.current = 'email';
      }
    } else if (analyticsIdRef.current !== null) {
      analyticsIdRef.current = null;
      resetAnalytics();
      resetFlagUser();
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
      await authService.logout();
      setUser(null);
      setPendingVerifyEmail(null);
    } catch (error) {
      console.error(error);
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
