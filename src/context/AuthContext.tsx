import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { authService } from '../services/auth';
import { migrateLegacyKeychain } from '../services/tokenStorage';
import { registerSessionExpiredListener } from '../services/apiClient';
import { identifyUser, resetAnalytics, track } from '../services/analytics';
import { LoginRequest, RegisterRequest, User } from '../types/auth';

/**
 * AsyncStorage key for the dev-only "Replay onboarding" override.
 * Persisted so a reload mid-test keeps the user in replay. See
 * `forceOnboarding` below.
 */
const FORCE_ONBOARDING_STORAGE_KEY = '@auxi/force_onboarding';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  /**
   * Dev-only client-side override that forces the Onboarding stack to
   * render even when the backend `is_first_login` flag is already
   * `false`. Lets QA re-run onboarding without registering a new
   * account. Persisted in AsyncStorage so a reload during a test
   * session keeps replay active. Defaults to `false`; cleared
   * automatically inside `completeOnboarding()`.
   */
  forceOnboarding: boolean;
  /**
   * Dev-only entry point for "Replay onboarding". Sets
   * `forceOnboarding=true` (persisted) so AppNavigator swaps to the
   * Onboarding stack at its first screen. Gated behind `__DEV__` +
   * `ONBOARDING_REPLAY_ENABLED` at the call site (SettingsScreen).
   */
  startOnboardingReplay: () => Promise<void>;
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
  // Dev-only replay override. Default false; hydrated from AsyncStorage on
  // mount so a reload mid-test keeps the user in onboarding replay.
  const [forceOnboarding, setForceOnboarding] = useState(false);
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

  // Hydrate the dev-only replay override from AsyncStorage on cold start.
  // Best-effort: a read failure just leaves the safe default (false).
  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(FORCE_ONBOARDING_STORAGE_KEY)
      .then(value => {
        if (isMounted && value === 'true') {
          setForceOnboarding(true);
        }
      })
      .catch(error => {
        console.warn('Failed to read force-onboarding override', error);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Dev-only: enter onboarding replay. Persist + set the override so
   * AppNavigator remounts the Onboarding stack at its first screen
   * (Welcome). No navigation.reset is needed — the conditional stack
   * swap in AppNavigator unmounts the Home routes and mounts the
   * Onboarding routes, landing on the first registered screen.
   */
  const startOnboardingReplay = useCallback(async () => {
    await AsyncStorage.setItem(FORCE_ONBOARDING_STORAGE_KEY, 'true');
    setForceOnboarding(true);
  }, []);

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
      const profile: Record<string, unknown> = {
        $email: user.email,
        $created: user.created_at,
      };
      if (user.gender) {
        profile.gender = user.gender;
      }
      if (user.user_metadata?.style_direction) {
        profile.style_direction = user.user_metadata.style_direction;
      }
      if (user.user_metadata?.confidence_level) {
        profile.confidence_level = user.user_metadata.confidence_level;
      }
      identifyUser(distinctId, profile);
      if (justLoggedInRef.current) {
        justLoggedInRef.current = false;
        track('sign_in_completed', { method: 'email' });
      }
    } else if (analyticsIdRef.current !== null) {
      analyticsIdRef.current = null;
      resetAnalytics();
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
        // Clear the dev replay override here (not at the call site) so it
        // works wherever completeOnboarding() runs — today on /generate
        // success, and after the V2 cutover when it moves to the Outro
        // "See my outfit" tap. Best-effort persist clear; the in-memory
        // flip is what actually drops the user back onto Home.
        setForceOnboarding(false);
        AsyncStorage.removeItem(FORCE_ONBOARDING_STORAGE_KEY).catch(error => {
          console.warn('Failed to clear force-onboarding override', error);
        });
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
        forceOnboarding,
        startOnboardingReplay,
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
