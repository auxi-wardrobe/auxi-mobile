/**
 * Authentication Types
 * Based on API_DOCUMENTATION.md authentication section
 */

export type DailyNotificationPeriod = 'AM' | 'PM';
export type DailyNotificationFrequency = 'weekdays' | 'everydays';
export type UserStyleDirection = 'stay_balanced' | 'more_relaxed' | 'more_polished';
export type UserConfidenceLevel = 'conservative' | 'balanced' | 'bold';
export type UserDisplayState = 'light' | 'dark';

export interface UserDailyNotificationSettings {
  enabled?: boolean;
  time?: string;
  period?: DailyNotificationPeriod;
  frequency?: DailyNotificationFrequency;
}

/**
 * Persisted onboarding selection (wardrobe direction + fit + ranked styles).
 * Stored loosely (plain strings) to keep `types/auth` a leaf module — the
 * branded `WardrobeDirection`/`FitPreference`/`StyleTag` unions live in
 * `services/v05Api`, which itself imports this file. App code reads this back
 * as a `V05OnboardingSelection` (structurally identical, strings widen) to
 * render chips and seed a retake. See `Personalization` → "Style Direction".
 */
export interface OnboardingProfileMetadata {
  wardrobe_direction: string;
  fit_preference: string;
  style_preferences: string[];
}

export interface UserMetadata {
  daily_notification?: UserDailyNotificationSettings;
  style_direction?: UserStyleDirection;
  confidence_level?: UserConfidenceLevel;
  display_state?: UserDisplayState;
  // Snapshot of the user's onboarding answers — written on first-time
  // completion (Outro) and replaced only when a retake is Saved.
  onboarding_profile?: OnboardingProfileMetadata;
}

export interface User {
  id: number | string;
  email: string;
  role?: string;
  created_at: string;
  is_active: boolean;
  gender?: string | null;
  is_first_login?: boolean;
  user_metadata?: UserMetadata | null;
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

export interface ResetPreferencesResponse {
  message: string;
  user: User;
}

export interface ApiValidationDetail {
  type?: string;
  loc?: Array<string | number>;
  msg?: string;
  input?: unknown;
}

export interface ApiError {
  error: string;
  message: string;
  detail?: ApiValidationDetail[];
  details?: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
