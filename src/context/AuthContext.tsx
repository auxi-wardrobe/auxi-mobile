import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/auth';
import { LoginRequest, RegisterRequest, User } from '../types/auth';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    completeOnboarding: (data?: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const isAuthenticated = await authService.isAuthenticated();
            if (isAuthenticated) {
                const userData = await authService.getCurrentUser();
                setUser(userData);
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
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (data: LoginRequest) => {
        setIsLoading(true);
        try {
            await authService.login(data);
            await checkAuth(); // Fetch user details after login
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (data: RegisterRequest) => {
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
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await authService.logout();
            setUser(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const completeOnboarding = async (data?: Partial<User>) => {
        if (!user) return;
        setIsLoading(true);
        try {
            const updateData = { ...data, is_first_login: false };
            const updatedUser = await authService.updateUser(updateData);
            setUser(updatedUser);
        } catch (error) {
            console.error('Failed to complete onboarding', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout, checkAuth, completeOnboarding }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
