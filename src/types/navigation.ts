import { NavigatorScreenParams } from '@react-navigation/native';
import type {
  FitPreference,
  StyleTag,
  WardrobeDirection,
} from '../services/v05Api';

export type AuthStackParamList = {
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
        mode?: 'manage' | 'tryOn';
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
  OutfitCanvas: {
    outfitId?: string;
    items?: Array<{ id: string; imageUrl: string }>;
  } | undefined;
};
