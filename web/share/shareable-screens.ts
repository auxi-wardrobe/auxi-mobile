/**
 * Web-review "share a screen" registry — single source of truth for the
 * sandbox preview's screen picker (see `web/device-frame/DeviceFrame.tsx`).
 *
 * A shared link is the outer preview URL with `?screen=<key>`. On load the
 * web entry (`index.web.tsx`) resolves the key here to decide which mock-auth
 * state to seed and which screen to navigate to once the navigator is ready.
 *
 * Scope (v1): only screens that render WITHOUT required route params are
 * listed — param-dependent data screens (ItemDetail, SeeThisOnMe,
 * LegalDocument, and the later onboarding steps that thread a selection)
 * are intentionally excluded so a shared link can never land on a crashed /
 * blank screen. Add them later with safe default params.
 */
export type ReviewAuthState = 'logged-out' | 'first-login' | 'app';
export type ShareGroup = 'Logged out' | 'Onboarding' | 'App';

/**
 * Navigation target for a shareable screen.
 *  - `app`  → a top-level screen in the authenticated / onboarding stack
 *             (navigate by name on the root navigator).
 *  - `auth` → a screen nested inside the `Auth` navigator
 *             (navigate as `Auth` → { screen: name }).
 */
export type ShareTarget =
  | { kind: 'app'; name: string; params?: Record<string, unknown> }
  | { kind: 'auth'; name: string };

export interface ShareableScreen {
  /** URL value: `?screen=<key>`. Stable, kebab-case. */
  key: string;
  /** Human label shown in the picker. */
  label: string;
  group: ShareGroup;
  /** Mock-auth state the sandbox must seed for this screen to mount. */
  authState: ReviewAuthState;
  target: ShareTarget;
}

export const GROUP_ORDER: ShareGroup[] = ['Logged out', 'Onboarding', 'App'];

export const SHAREABLE_SCREENS: ShareableScreen[] = [
  // ── Logged out (Auth stack) — param-free routes only ────────────────────
  {
    key: 'welcome',
    label: 'Welcome (auth)',
    group: 'Logged out',
    authState: 'logged-out',
    target: { kind: 'auth', name: 'Welcome' },
  },
  {
    key: 'language',
    label: 'Language settings',
    group: 'Logged out',
    authState: 'logged-out',
    target: { kind: 'auth', name: 'LanguageSettings' },
  },

  // ── Onboarding (first-login stack) — param-free routes only ─────────────
  {
    key: 'onboarding-welcome',
    label: 'Onboarding · intro',
    group: 'Onboarding',
    authState: 'first-login',
    target: { kind: 'app', name: 'Welcome' },
  },
  {
    key: 'location-permission',
    label: 'Onboarding · location permission',
    group: 'Onboarding',
    authState: 'first-login',
    target: { kind: 'app', name: 'LocationPermission' },
  },
  {
    key: 'onboarding-wardrobe',
    label: 'Onboarding · wardrobe',
    group: 'Onboarding',
    authState: 'first-login',
    target: { kind: 'app', name: 'OnboardingWardrobe' },
  },

  // ── App (logged-in stack) ───────────────────────────────────────────────
  {
    key: 'home',
    label: 'Home',
    group: 'App',
    authState: 'app',
    target: { kind: 'app', name: 'Home' },
  },
  {
    key: 'wardrobe',
    label: 'Wardrobe',
    group: 'App',
    authState: 'app',
    target: { kind: 'app', name: 'Wardrobe' },
  },
  {
    key: 'favourite',
    label: 'Favourite',
    group: 'App',
    authState: 'app',
    target: { kind: 'app', name: 'Favourite' },
  },
  {
    key: 'settings',
    label: 'Settings',
    group: 'App',
    authState: 'app',
    target: { kind: 'app', name: 'Settings' },
  },
  {
    key: 'upgrade',
    label: 'Upgrade (Macgie+)',
    group: 'App',
    authState: 'app',
    target: { kind: 'app', name: 'Upgrade' },
  },
  {
    key: 'body',
    label: 'Body',
    group: 'App',
    authState: 'app',
    target: { kind: 'app', name: 'Body' },
  },
  {
    key: 'feedback',
    label: 'Feedback',
    group: 'App',
    authState: 'app',
    target: { kind: 'app', name: 'Feedback' },
  },
  {
    key: 'database',
    label: 'Database',
    group: 'App',
    authState: 'app',
    target: { kind: 'app', name: 'Database' },
  },
  {
    key: 'outfit-canvas',
    label: 'Outfit canvas',
    group: 'App',
    authState: 'app',
    target: { kind: 'app', name: 'OutfitCanvas' },
  },
  {
    key: 'design-system',
    label: 'Design system',
    group: 'App',
    authState: 'app',
    target: { kind: 'app', name: 'DesignSystem' },
  },

  // ── Capsule Wardrobe (param screens carry safe mock defaults) ────────────
  {
    key: 'capsule',
    label: 'Capsule · list',
    group: 'App',
    authState: 'app',
    target: { kind: 'app', name: 'CapsuleWardrobe' },
  },
  {
    key: 'capsule-create',
    label: 'Capsule · name',
    group: 'App',
    authState: 'app',
    target: { kind: 'app', name: 'CapsuleCreate' },
  },
  {
    key: 'capsule-info',
    label: 'Capsule · requirements',
    group: 'App',
    authState: 'app',
    target: { kind: 'app', name: 'CapsuleInfo', params: { name: 'Work Week' } },
  },
  {
    key: 'capsule-generating',
    label: 'Capsule · generating',
    group: 'App',
    authState: 'app',
    target: {
      kind: 'app',
      name: 'CapsuleGenerating',
      params: {
        name: 'Work Week',
        temp_min: 12,
        temp_max: 24,
        formalness_level: 6,
        outfit_target: 3,
        shoe_limit: 2,
      },
    },
  },
  {
    key: 'capsule-detail',
    label: 'Capsule · detail',
    group: 'App',
    authState: 'app',
    target: { kind: 'app', name: 'CapsuleDetail', params: { capsuleId: 'cap-1' } },
  },
  {
    key: 'capsule-item',
    label: 'Capsule · item detail',
    group: 'App',
    authState: 'app',
    target: {
      kind: 'app',
      name: 'CapsuleItemDetail',
      params: { capsuleId: 'cap-1', itemId: 'citm-1' },
    },
  },
];
