import { NavigatorScreenParams } from '@react-navigation/native';
import type {
  FitPreference,
  StyleTag,
  WardrobeDirection,
} from '../services/v05Api';

/**
 * AU-242 — UAC v2 auth stack routes.
 *
 * The 11 routes registered here cover the UAC flow specced in
 * `plans/260521-2335-au-242-figma-spec/`. Param shapes follow the
 * branching documented in `phase-04-screens.md` §5 (Architecture).
 */
export type UacEmailInputMode = 'signup' | 'signin';
export type UacVerifiedSource = 'signup' | 'reset';

export type AuthStackParamList = {
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
};

/**
 * AU-312 — minimal serializable payload Home passes alongside `itemId` so
 * ItemDetail can render items whose id misses the user's wardrobe lookup
 * (V05 `common_essential` injections). Mirrors the WardrobeItem fields the
 * read-mode screen actually shows; unfetchable fields stay undefined and
 * the screen degrades gracefully (no date row, category-label title).
 */
export interface ItemDetailFallbackItem {
  id: string;
  image_url?: string;
  image_png?: string;
  name?: string;
  category?: string;
  is_common_item?: boolean;
}

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
  // Discriminated union on `mode` so call sites are type-checked:
  //  - tryOn MUST carry an `outfit` (removes the old `outfit!` assertion in BodyScreen)
  //  - photoDetail (Settings redesign Frame 5) opens the single body-photo
  //    detail view (full 3:4 image + metadata + Delete/Retake) instead of the
  //    multi-photo manager grid. Reached from Settings "Manage body photo".
  //    `bodyId` optional — absent means show current/first selected body.
  //  - manage / undefined → multi-photo manager grid (default).
  Body:
    | { mode?: 'manage' }
    | { mode: 'tryOn'; outfit: TryOnOutfitContext }
    | { mode: 'photoDetail'; bodyId?: string }
    | undefined;
  Welcome: undefined;
  LocationPermission: undefined;
  // ───────────────────────────────────────────────────────────────────────
  // Onboarding V2 redesign (AU-249) — the only onboarding flow.
  //
  // Selections thread through route params (no store — per auxi "no Zustand"
  // rule). Each step forwards the accumulated selection to the next:
  //   OnboardingWardrobe → wardrobe_direction
  //   OnboardingFit      → + fit_preference (wire value; UI label per D2)
  //   OnboardingStyles   → ranked StyleTag[] picked in local state; Next
  //                        forwards the full selection to OnboardingLoading
  //                        (the screen no longer owns the /generate call).
  //   OnboardingLoading  → owns POST /generate (Loading IS the in-flight call,
  //                        D10). On success → replace to OnboardingCompleted;
  //                        on error → back to OnboardingStyles with a retry.
  //   OnboardingCompleted → "Your wardrobe is ready" → OnboardingOutro
  //   OnboardingOutro    → "See my outfit" → completeOnboarding() → Home swap
  //
  // `OnboardingFit` and `OnboardingStyles` are each ONE screen parameterised
  // by the upstream wardrobe choice (D8) — not 3 distinct flows.
  OnboardingWardrobe: undefined;
  OnboardingFit: { wardrobe_direction: WardrobeDirection };
  OnboardingStyles: {
    wardrobe_direction: WardrobeDirection;
    fit_preference: FitPreference;
  };
  // Loading owns the /generate mutation (moved out of Styles per D10). Carries
  // the full selection forward so it can fire the call and, on success,
  // hand the same selection to Completed (which renders from it instantly).
  OnboardingLoading: { selection: V05OnboardingSelection };
  OnboardingCompleted: { selection: V05OnboardingSelection };
  OnboardingOutro: { selection: V05OnboardingSelection };
  // AU-312: `fallbackItem` carries the Home tile's payload so the pushed
  // detail screen can still render V05 `common_essential` injections —
  // those ids are NOT in the user's wardrobe list, so the
  // wardrobeService.getWardrobeItem(id) lookup misses (see
  // figma-extraction-item-detail.md Q7). Keep it serializable.
  ItemDetail: { itemId: string; fallbackItem?: ItemDetailFallbackItem };
  Database: undefined;
  OutfitCanvas:
    | {
        outfitId?: string;
        items?: Array<{ id: string; imageUrl: string }>;
      }
    | undefined;
};
