import * as Keychain from 'react-native-keychain';
import axios from 'axios';
import { LoginRequest, RegisterRequest, AuthResponse, User } from '../types/auth'; // We need to define these types

// Base URL for API
// ANDROID: http://10.0.2.2:5001/api/v1
// IOS: http://localhost:5001/api/v1
// TODO: Externalize config
const BASE_URL = 'http://localhost:5001/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add token to requests
api.interceptors.request.use(async (config: any) => {
  try {
    const credentials = await Keychain.getGenericPassword();
    if (credentials) {
      const { password: accessToken } = credentials; // storing token in password field
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  } catch (error) {
    console.error('Error retrieving token', error);
  }
  return config;
});

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post('/login', data);
      const { access_token } = response.data;
      
      // Store tokens securely
      // Ideally we should store both, but Keychain stores username/password pair.
      // We can JSON.stringify logic or use multiple entries. 
      // For MVP, simplifying to just generic password = access_token.
      // Better approach: Store access_token in password, refresh_token in service (or custom keys if library supports)
      // Or use a dedicated storage library like react-native-encrytped-storage for multi-key.
      // For now, let's assume specific Keychain usage or just Access Token.
      // UPDATE: Standard practice with react-native-keychain is generic password.
      await Keychain.setGenericPassword('currentUser', access_token);
      
      // TODO: Handle Refresh Token storage separately if needed, or stick to simple JWT for MVP.

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

  logout: async () => {
    try {
      // Optional: Call API to revoke refresh token
      // await api.post('/logout', { refresh_token: ... });
      await Keychain.resetGenericPassword();
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
      const credentials = await Keychain.getGenericPassword();
      return !!credentials;
  }
};
