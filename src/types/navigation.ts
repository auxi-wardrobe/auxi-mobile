import { NavigatorScreenParams } from '@react-navigation/native';
import type {
  FitPreference,
  StyleTag,
  WardrobeDirection,
} from '../services/v05Api';
import type { LegalScreenParams } from '../screens/legal/LegalDocumentScreen';
import type { BodyShape } from '../services/bodyService';

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
  // In-app legal docs reachable pre-auth from Welcome's legal footer links.
  // Same screen + param shape as the authenticated app stack's LegalDocument.
  LegalDocument: LegalScreenParams;
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

/**
 * AI Image Enhancement — serializable result EnhanceImage pops back to
 * ItemDetail after "Replace original" succeeds, so the detail screen can show
 * the enhanced image immediately without a refetch (the wardrobe list cache is
 * invalidated separately). `image_studio` is the accepted studio shot; it wins
 * the display precedence (image_studio → image_png → image_url).
 */
export interface EnhanceAppliedResult {
  id: string;
  image_studio?: string;
  beautify_status?: 'accepted';
}

/**
 * Local outfit item-swap intent (no pin). Returned to Home by the wardrobe
 * picker (ItemDetail "Change" flow): replace `fromItemId` in the currently
 * viewed outfit with `toItem`. This is a one-off swap on the active outfit —
 * it does NOT pin the item or regenerate suggestions around it.
 */
export interface HomeOutfitSwap {
  fromItemId: string;
  // Serializable wardrobe payload, mapped to an outfit `Item` on Home.
  toItem: {
    id: string;
    image_url?: string;
    image_png?: string;
    name?: string;
    category?: string;
    color_hex?: string;
    is_common_item?: boolean;
  };
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
  // AU-307 phase 05 — ItemDetail "Build around this" navigates Home with
  // `pinFromDetail` set to the item id. HomeScreen consumes it on mount via
  // `CONFIRM_PIN_FROM_DETAIL` (skipping the confirm modal), then clears
  // the param so re-focus / re-render does not refire the auto-pin.
  // `swapItem` carries a one-off "Change" intent from the wardrobe picker:
  // replace the viewed item in the active outfit with the chosen one, WITHOUT
  // pinning (distinct from `pinFromDetail`, which pins + rebuilds around it).
  Home: { pinFromDetail?: string; swapItem?: HomeOutfitSwap } | undefined;
  Settings: undefined;
  // Macgie+ paywall — reached from the Settings "Upgrade to Macgie+" pill
  // (shown to free users). Pushed on top of Settings so it keeps the standard
  // back gesture / chevron. `source` records where the paywall was opened from
  // (matches the `upgrade_entry_tapped` event) so `paywall_viewed` can attribute
  // the funnel denominator; defaults to 'settings' when absent.
  Upgrade: { source?: string } | undefined;
  // Settings sub-screens (grouped IA). The main Settings screen keeps the
  // daily-reminder controls + "Delete My Data"; these three carry the grouped
  // secondary settings, pushed on top so they get the standard back gesture.
  SettingsPersonalization: undefined;
  SettingsPrivacy: undefined;
  SettingsAbout: undefined;
  // `mode: 'select'` opens the wardrobe as a single-item picker (reached from
  // ItemDetail's "Change" swap button when the detail was opened from a Home
  // suggestion). The grid stops navigating into ItemDetail and instead lets the
  // user pick exactly one item; the "Change" CTA pops back to Home with a
  // `swapItem` intent that replaces the viewed item in the active outfit — a
  // one-off swap, NOT a pin. `excludeItemId` is the item being changed: it's
  // hidden from the picker (you can only swap it for ANOTHER item) and becomes
  // the swap's `fromItemId`.
  // `pendingImportUrl` carries the image URL picked in the ImportFromWeb flow.
  // Import is NON-blocking (mirrors the take-photo flow): the preview hands the
  // URL straight back here, and THIS screen fires the create call, shows the
  // "item added" snackbar and renders an optimistic preparing placeholder tile
  // until the backend item lands. The param is cleared on consume so a
  // re-focus doesn't refire the import.
  Wardrobe:
    | { mode?: 'select'; excludeItemId?: string; pendingImportUrl?: string }
    | undefined;
  // `returnToSchedule` is set when the user reached this page via the Schedule
  // "+" source picker — after scheduling an outfit we send them back to
  // Schedule (focused on the chosen day) instead of staying here. `scheduleDate`
  // ("YYYY-MM-DD") carries the day selected on Schedule so the date-picker sheet
  // opens pre-selected on it (not today).
  // `showBackButton` swaps the header hamburger for a back chevron (→ goBack) so
  // the user can return to the context they came from (Schedule "+" picker,
  // Outfit Canvas, …) rather than the page reading as a top-level destination.
  Favourite:
    | { returnToSchedule?: boolean; scheduleDate?: string; showBackButton?: boolean }
    | undefined;
  // Schedule — plan outfits per day. Reached from the sidebar menu (listed
  // directly under "My Favourite"). Header mirrors Wardrobe (menu + title +
  // add). Figma node 4252:26702. `focusDate` ("YYYY-MM-DD") preselects a day
  // when arriving from the Favourite page's date-picker.
  Schedule: { focusDate?: string } | undefined;
  // In-app feedback form → POST /api/feedback. Reached from the sidebar menu.
  Feedback: undefined;
  // Discriminated union on `mode` so call sites are type-checked:
  //  - tryOn MUST carry an `outfit` (removes the old `outfit!` assertion in BodyScreen)
  //  - photoLibrary → wardrobe-style grid of ALL the user's body photos
  //    (uploaded, AI body-shape, selfie …). Reached from Settings "Manage body
  //    photo"; tapping a tile opens `photoDetail` for that body.
  //  - photoDetail (Settings redesign Frame 5) opens the single body-photo
  //    detail view (full 3:4 image + metadata + Delete/Retake) instead of the
  //    multi-photo manager grid. Reached from the photoLibrary grid.
  //    `bodyId` optional — absent means show current/first selected body.
  //  - manage / undefined → multi-photo manager grid (default).
  Body:
    | { mode?: 'manage' }
    | { mode: 'tryOn'; outfit: TryOnOutfitContext }
    | { mode: 'photoLibrary' }
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
  // `enhancedItem` is a RETURN param: set only by EnhanceImage's popTo after a
  // successful "Replace original", consumed (merged into state + cleared) by
  // ItemDetail's mount-level effect — callers never pass it when pushing.
  ItemDetail: {
    itemId: string;
    fallbackItem?: ItemDetailFallbackItem;
    enhancedItem?: EnhanceAppliedResult;
  };
  // AI Image Enhancement preview (reached from ItemDetail's sparkle FAB).
  // Fires POST /items/{id}/beautify on mount and polls for the candidate —
  // the on-demand v2 of the upload-time beautify flow (spec §3 non-goal #1,
  // now in scope). `displayUri` is the image the detail screen was showing;
  // it doubles as the loading backdrop and the long-press compare baseline.
  EnhanceImage: { itemId: string; displayUri: string };
  // __DEV__-only in-app Design System reference / style-guide catalog.
  // Reached from the Settings "Version" row in dev builds; not shipped to prod.
  DesignSystem: undefined;
  // "See this on me" / Self visualization virtual try-on (Workstream 5,
  // Figma node 2852:22266). A 3-step conversational capture flow
  // (selfie → full-body → body-shape) that uploads a body photo and renders
  // the saved outfit onto it via POST /api/tryon/highres. `outfit` carries the
  // serializable TryOnOutfitContext the flow needs (hash, item ids/urls, note).
  //
  // `reuseAction` is set only when entering FROM the reuse-confirm gate
  // (`SeeThisOnMeConfirm`), which already owns the "reuse your saved body?"
  // sheet — so the in-flow screen skips that sheet and jumps straight to:
  //  - 'render': render the outfit onto the saved body (`reuseBodyId` /
  //    `reuseShape` carry the confirmed profile so no re-fetch is needed);
  //  - 'capture': run the normal selfie→full-body→shape capture flow (the
  //    user tapped Retake, or has no saved profile).
  // Omitted for resume/deep-link entries (e.g. the completion-notice popTo),
  // which rehydrate from the background store instead.
  SeeThisOnMe: {
    outfit: TryOnOutfitContext;
    reuseAction?: 'render' | 'capture';
    reuseBodyId?: string;
    reuseShape?: BodyShape | null;
  };
  // Reuse-confirm gate for "See this on me" (see SeeThisOnMeConfirmScreen).
  // A transparent-modal screen presented OVER the originating page (Favourite /
  // Creations / Schedule): it loads the user's saved body profile and, when one
  // exists, shows the confirm bottom sheet with that page still visible behind
  // it — then hands off to `SeeThisOnMe` for the actual render/capture.
  SeeThisOnMeConfirm: { outfit: TryOnOutfitContext };
  // Landing screen for a tapped "your try-on is ready" push notification
  // (backend `tryon_render_completed`, see `deepLinkHandler.resolveNotificationData`).
  // A push can only carry the rendered image URL, not the full outfit context
  // SeeThisOnMe needs to resume its flow — so this is a minimal read-only
  // viewer reusing the same preview UI (Figma 3398:17581) instead.
  TryOnResult: { compositeUrl: string };
  Database: undefined;
  // "Import from web" (Figma: Import from web flow) — reached from the Add-item
  // sheet's "Search images" option. Self-contained flow: query input → embedded
  // Google results (WebView) → Extract images → Select an image → Preview →
  // Import. Import taps hand the picked URL back to Wardrobe via
  // `pendingImportUrl` immediately (non-blocking) — Wardrobe owns the create
  // call and the optimistic preparing tile.
  ImportFromWeb: undefined;
  BeautifyPending: { itemId: string; originalUri: string };
  BeautifyReview: { itemId: string; originalUri: string; from?: 'loader' | 'snackbar' };
  OutfitCanvas:
    | {
        outfitId?: string;
        items?: Array<{ id: string; imageUrl: string; category?: string }>;
        // How the canvas was entered. 'remix' (from Home's Remix button) shows
        // a back chevron; 'menu' / undefined (from the sidebar drawer) shows the
        // hamburger that re-opens the drawer.
        entry?: 'remix' | 'menu';
      }
    | undefined;
  // "My Creations" — the saved-canvas list. Reached from the OutfitCanvas
  // header's My Creations icon; saving a creation also lands here. Local
  // (AsyncStorage) store, no params.
  // `returnToSchedule` / `scheduleDate` — see Favourite. Set when reached via
  // the Schedule "+" source picker so scheduling a creation returns the user to
  // Schedule and the date sheet opens on the day selected there.
  MyCreations:
    | { returnToSchedule?: boolean; scheduleDate?: string; showBackButton?: boolean }
    | undefined;
  // In-app legal docs (Terms of Service / Privacy Policy) — App Store blocker
  // B5. Reachable from Settings while authenticated; the auth stack registers
  // the same route+param shape for the Welcome-screen (unauth) entry point.
  LegalDocument: LegalScreenParams;
  // ───────────────────────────────────────────────────────────────────────
  // Capsule Wardrobe (spec plans/260718-0433-capsule-wardrobe/spec.md §5).
  // Reached from the wardrobe switcher ("Choose a wardrobe" → Create Capsule).
  // Create is a 2-step wizard (name → reqs); the generating screen owns the
  // create mutation and lets the user leave while it runs in the background
  // (React-Query continuation + toast).
  CapsuleCreate: undefined;
  CapsuleInfo: { name: string };
  CapsuleGenerating: {
    name: string;
    temp_min: number | null;
    temp_max: number | null;
    formalness_level: number | null;
    outfit_target: number | null;
    shoe_limit: number | null;
    item_ids?: string[];
  };
  CapsuleDetail: { capsuleId: string };
  CapsuleItemDetail: { capsuleId: string; itemId: string };
  // Edit a capsule's name + requirements (design revision §9.2). Save PATCHes
  // /capsules/{id}; a constraint change regenerates outfits server-side.
  CapsuleEdit: { capsuleId: string };
};
