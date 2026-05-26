import { NavigatorScreenParams } from '@react-navigation/native';
import type {
  FitPreference,
  StyleTag,
  WardrobeDirection,
} from '../services/v05Api';

/**
 * AU-242 — UAC v2 auth stack routes.
 *
 * The 11 new routes registered here cover the UAC flow specced in
 * `plans/260521-2335-au-242-figma-spec/`. Param shapes follow the
 * branching documented in `phase-04-screens.md` §5 (Architecture).
 *
 * `Login` / `Register` are retained as feature-flagged fallbacks so
 * we can revert to the legacy auth experience by flipping
 * `UAC_V2_ENABLED` off. They will be deleted in the cleanup phase
 * once batch D lands and the flag is permanently on.
 */
export type UacEmailInputMode = 'signup' | 'signin';
export type UacVerifiedSource = 'signup' | 'reset';

export type AuthStackParamList = {
  // New (UAC v2)
  Welcome: undefined;
  LanguageSettings: undefined;
  EmailInput: { mode: UacEmailInputMode };
  PasswordCreation: { email: string };
  VerifyEmail: { email: string };
  EmailGoogleNotice: { email: string };
  SignIn: { email: string };
  ForgotPasswordRequest: { email: string };
  ForgotPasswordCheckMail: { email: string };
  ResetNewPassword: { token: string; email?: string };
  Verified: { source: UacVerifiedSource };

  // Legacy (kept while UAC_V2_ENABLED=false; deleted in cleanup phase)
  Login: undefined;
  Register: undefined;
};

export type GenderPreferenceValue = 'womenswear' | 'menswear' | 'mixed';

export interface TryOnOutfitContext {
  outfitHash: string;
  itemIds: string[];
  itemImageUrls: string[];
  stylingNote: string;
}

/**
 * V05 onboarding selections accumulated across screens, then submitted
 * together to `/api/v05/onboarding/generate`. See
 * `services/v05Api.ts#GenerateStarterWardrobeInput`.
 */
export interface V05OnboardingSelection {
  wardrobe_direction: WardrobeDirection;
  fit_preference: FitPreference;
  style_preferences: StyleTag[];
}

export type AppStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Home: undefined;
  Settings: undefined;
  Wardrobe: undefined;
  Body:
    | {
        // 'photoDetail' (Settings redesign Frame 5) opens the single body-photo
        // detail view (full 3:4 image + metadata + Delete/Retake) instead of
        // the multi-photo manager grid. Reached from Settings "Manage body photo".
        mode?: 'manage' | 'tryOn' | 'photoDetail';
        outfit?: TryOnOutfitContext;
      }
    | undefined;
  Welcome: undefined;
  LocationPermission: undefined;
  // V05 onboarding flow (AU-249).
  // GenderPreference → wardrobe_direction (Menswear/Womenswear/Mixed)
  // StylePreference → fit_preference (Slim/Classic/Relaxed)
  // StylePicker → style_preferences (2-3 of Minimal/Casual/Soft/Bold/Formal)
  //   then triggers generation + lands on Home.
  GenderPreference: undefined;
  StylePreference:
    | { gender?: GenderPreferenceValue; wardrobe_direction?: WardrobeDirection }
    | undefined;
  StylePicker: {
    wardrobe_direction: WardrobeDirection;
    fit_preference: FitPreference;
  };
  ItemDetail: { itemId: string };
  Database: undefined;
  OutfitCanvas:
    | {
        outfitId?: string;
        items?: Array<{ id: string; imageUrl: string }>;
      }
    | undefined;
};
