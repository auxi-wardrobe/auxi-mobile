/**
 * Authentication Types
 * Based on API_DOCUMENTATION.md authentication section
 */

export interface UserMetadata {
  onboarding_step?: number;
  preferences?: {
    style?: string[];
    colors?: string[];
    sizes?: {
      top?: string;
      bottom?: string;
      shoe?: string;
    };
    [key: string]: any; // Allow extensibility
  };
}

export interface User {
  id: number | string;
  email: string;
  created_at: string;
  is_active: boolean;
  is_first_login?: boolean;
  user_metadata?: UserMetadata;
}

export interface AuthTokens {
  access_token: string;
  expires_in: number; // seconds (900 = 15 minutes)
  refresh_token: string;
  refresh_expires_in: number; // seconds (2592000 = 30 days)
  token_type: 'Bearer';
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user?: User;
}

export interface StoredTokenData {
  access_token: string;
  refresh_token: string;
  access_token_expires_at: number; // Unix timestamp
  refresh_token_expires_at: number; // Unix timestamp
  user_email: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface ApiError {
  error: string;
  message: string;
  details?: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
