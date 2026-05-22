import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { authService } from '../services/auth';
import { migrateLegacyKeychain } from '../services/tokenStorage';
import { LoginRequest, RegisterRequest, User } from '../types/auth';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<User | null>;
    updateCurrentUser: (data: Partial<User>) => Promise<User>;
    resetUserPreferences: () => Promise<User>;
    checkAuth: () => Promise<void>;
    completeOnboarding: (data?: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async (): Promise<User | null> => {
        const userData = await authService.getCurrentUser();
        setUser(userData);
        return userData;
    }, []);

    const updateCurrentUser = useCallback(async (data: Partial<User>): Promise<User> => {
        const updatedUser = await authService.updateUser(data);
        setUser(updatedUser);
        return updatedUser;
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

    const login = useCallback(async (data: LoginRequest) => {
        setIsLoading(true);
        try {
            await authService.login(data);
            await checkAuth(); // Fetch user details after login
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [checkAuth]);

    const register = useCallback(async (data: RegisterRequest) => {
        setIsLoading(true);
        try {
            await authService.register(data);
            // Auto-login after register
            await login({ email: data.email, password: data.password });
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [login]);

    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            await authService.logout();
            setUser(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const completeOnboarding = useCallback(async (data?: Partial<User>) => {
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
    }, [updateCurrentUser, user]);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                login,
                register,
                logout,
                refreshUser,
                updateCurrentUser,
                resetUserPreferences,
                checkAuth,
                completeOnboarding,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
