import axios from 'axios';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ResetPreferencesResponse,
  User,
} from '../types/auth';
import { BASE_URL } from '../config/env';
import {
  clearTokens,
  getAccessToken,
  setTokens,
} from './tokenStorage';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add token to requests
api.interceptors.request.use(async (config: any) => {
  try {
    const accessToken = await getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  } catch (error) {
    console.error('Error retrieving token', error);
  }
  return config;
});

const computeExpiresAt = (expiresIn?: number): number | null => {
  if (!expiresIn || Number.isNaN(expiresIn)) return null;
  return Math.floor(Date.now() / 1000) + expiresIn;
};

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post('/login', data);
      const {
        access_token,
        refresh_token,
        expires_in,
        refresh_expires_in,
      } = response.data as AuthResponse & { refresh_expires_in?: number };

      await setTokens({
        access_token,
        refresh_token: refresh_token ?? null,
        access_token_expires_at: computeExpiresAt(expires_in),
        refresh_token_expires_at: computeExpiresAt(refresh_expires_in),
        user_email: data.email,
      });

      return response.data;
    } catch (error) {
      console.error('Login error', error);
      throw error;
    }
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post('/register', data);
      return response.data;
    } catch (error) {
      console.error('Register error', error);
      throw error;
    }
  },

  updateUser: async (data: Partial<User>): Promise<User> => {
    try {
      const response = await api.put('/me', data);
      return response.data;
    } catch (error) {
      console.error('Update user error', error);
      throw error;
    }
  },

  resetPreferences: async (): Promise<User> => {
    try {
      const response = await api.post<ResetPreferencesResponse>(
        '/me/reset-preferences',
      );
      return response.data.user;
    } catch (error) {
      console.error('Reset preferences error', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      // Optional: Call API to revoke refresh token
      // await api.post('/logout', { refresh_token: ... });
      await clearTokens();
    } catch (error) {
      console.error('Logout error', error);
      throw error;
    }
  },

  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await api.get('/me');
      return response.data;
    } catch (error) {
      // If 401, token might be expired
      throw error;
    }
  },

  isAuthenticated: async (): Promise<boolean> => {
    const token = await getAccessToken();
    return !!token;
  },
};
