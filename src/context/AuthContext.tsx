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
            // Depending on API, register might return token or require login. 
            // Assuming register logs user in or requires separate login.
            // If API returns token, we can save it.
            // Based on docs: Register returns user but NO token directly in example?
            // Wait, docs say: "Response (201 Created): { message, user }". No token.
            // So we need to login after register.

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

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
