# Unleash Feature Flags — Mobile Setup (auxi)

> How the Auxi React Native app reads feature flags / gradual rollouts /
> kill-switches from the self-hosted Unleash server, using the official
> **`@unleash/unleash-react-native-sdk`**.
>
> **Design rule #1 — the flag layer is fully non-blocking and default-OFF.**
> Unleash was added and reverted twice before (PRs #95/#99, #249/#252) on
> suspected boot-coupling. This integration is built so a flag-service failure
> (outage, bad/absent token, unlinked native crypto module) can **never** block
> app boot or the new-user flow — every flag simply stays OFF until it can be
> fetched.

## Packages

| Package | Version | Why |
|---|---|---|
| `@unleash/unleash-react-native-sdk` | `1.0.3` | RN-flavoured Unleash client + React bindings. Auto-provides AsyncStorage persistence and a `crypto.getRandomValues` polyfill — we do **not** hand-roll either. |
| `unleash-proxy-client` | `3.8.2` | Peer of the RN SDK (the underlying browser/proxy client it wraps). Direct dep so resolution is stable. |

Transitive (installed automatically, do not add by hand):
`@unleash/proxy-client-react`, `@react-native-async-storage/async-storage`
(already a project dep), **`react-native-get-random-values`** (a *native*
module — see [Activation](#activation--whats-still-needed)).

Pure-JS on the surface, but `react-native-get-random-values` carries a native
component, so a `yarn pods` + native rebuild is required to activate live flag
fetching. Until that happens the app still boots — flags just stay OFF.

## Architecture

```
auxi (RN, native)                          auxi (web / vite)
  App.tsx                                    App.tsx
    └─ <FeatureFlagProvider>  (services/featureFlags.tsx)
         │  = <FlagProvider unleashClient startClient={UNLEASH_ENABLED}>
         │     + <UnleashUserBridge/>  (userId + foreground refresh)
         │                                     └─ <FeatureFlagProvider>  (…​.web.tsx)
         ▼                                          = passthrough, no SDK
   UnleashClient singleton                          every flag = OFF
     GET /api/frontend  Authorization: <frontend-token>
         ▼
   Unleash server (Railway)  ──►  Postgres
```

The client polls `/api/frontend` every `refreshInterval` seconds and caches the
result in AsyncStorage (SDK default), so flags survive cold start / offline from
the last known values. `useFeatureFlag` reads the resolved toggles.

## Files

| File | Role |
|---|---|
| `src/config/unleash.ts` | Connection config. Embeds the dev/prod **Frontend** tokens per-env via a `__DEV__` split (mirrors `config/env.ts`) — no build-time env injector exists on native, so an env read would resolve to `''` and never turn a flag ON. Exports `UNLEASH_ENABLED` (true only when a key is present). |
| `src/services/featureFlags.tsx` | Native seam. Owns the `UnleashClient` singleton (built defensively in try/catch), the `FLAGS` name constants, `FeatureFlagProvider`, and the user/foreground bridge. **Only module that imports the SDK on native.** |
| `src/services/featureFlags.web.tsx` | Web no-op counterpart. `FeatureFlagProvider` = passthrough; exports `FLAGS`; `unleashClient = null`. vite resolves this ahead of the native file so the SDK never enters the browser bundle. |
| `src/hooks/useFeatureFlag.ts` | `useFeatureFlag(name: string): boolean`. Reads toggles directly off the singleton (provider-independent) → returns `false` when not-ready / on error / no provider. Never throws. |
| `src/hooks/useFeatureFlag.web.ts` | Web stub — always returns `false`. |
| `App.tsx` | Wraps the tree in `<FeatureFlagProvider>` **inside** `AuthProvider`. |
| `src/context/AuthContext.tsx` | (comment only) — notes that flag targeting is keyed on the same user id, wired in the provider bridge. |
| `src/hooks/useActiveTrendingDrop.ts` | Consumes the `trending_item_drop` flag to gate the Home card (see below). |

## Config — `src/config/unleash.ts`

```ts
// Frontend API endpoint (self-hosted Unleash on Railway).
const DEFAULT_UNLEASH_URL =
  'https://primary-production-ee649.up.railway.app/api/frontend';
export const UNLEASH_URL = DEFAULT_UNLEASH_URL;

// Frontend tokens — embedded per-env, split by __DEV__ (same as config/env.ts).
const DEV_CLIENT_KEY = '*:development.…';
const PROD_CLIENT_KEY = '*:production.…';
export const UNLEASH_CLIENT_KEY = __DEV__ ? DEV_CLIENT_KEY : PROD_CLIENT_KEY;

export const UNLEASH_APP_NAME = 'auxi';
export const UNLEASH_REFRESH_INTERVAL = 30;  // seconds
export const UNLEASH_METRICS_INTERVAL = 60;  // seconds

// Only start the client (hit the network) when a real key is present.
export const UNLEASH_ENABLED = UNLEASH_CLIENT_KEY.length > 0;
```

- The keys are **Frontend** tokens (type `frontend`, `*:development.…` /
  `*:production.…`). They are read-only and env-scoped — the Frontend API
  evaluates strategies server-side and returns only on/off + variant, so no
  ruleset leaks to the device. Same risk class as the Mixpanel token already in
  `config/analytics.ts`; safe to ship in the client bundle. Never ship a client
  or admin token.
- The token already encodes its environment, so `__DEV__` picks the matching one:
  dev builds read dev flags, release builds read prod flags.
- **Empty key ⇒ `UNLEASH_ENABLED = false` ⇒ no network call ⇒ all flags OFF.**
  Safe by default.
- Embedding (rather than reading `process.env`) is deliberate: there is no
  `react-native-config` / build-time env inliner on native (see `auxi/CLAUDE.md`
  "API config" TODO), so an env read would resolve to `''` and no flag could ever
  turn ON.

## Provider — non-blocking by construction

`FeatureFlagProvider` (in `featureFlags.tsx`) wraps the app inside
`AuthProvider` in `App.tsx`. It **renders its children synchronously and never
gates on `flagsReady`**, so Unleash can never delay or block boot:

```tsx
export const FeatureFlagProvider = ({ children }) => {
  if (!client) return <>{children}</>;            // construction failed → no flags, app renders
  return (
    <FlagProvider unleashClient={client} startClient={UNLEASH_ENABLED}>
      <UnleashUserBridge />                        {/* userId + foreground refresh */}
      {children}                                   {/* rendered immediately */}
    </FlagProvider>
  );
};
```

Guarantees:
- The `UnleashClient` singleton is built once in a `try/catch` — a bad config
  can never throw during render.
- `startClient={UNLEASH_ENABLED}` — the client only hits the network when a real
  key is configured.
- An `'error'` listener swallows fetch/crypto failures (dev-logs only).
- `<FlagProvider>` renders children immediately; flags resolve async, default OFF.

### User targeting + foreground refresh (the bridge)

`UnleashUserBridge` renders nothing and lives inside the provider:

```tsx
const updateContext = useUnleashContext();
const client = useUnleashClient();
// Key rollouts on the logged-in user (stable % rollout stickiness):
useEffect(() => { updateContext(userId ? { userId } : { userId: undefined }); }, [userId]);
// Re-fetch the instant the app returns to foreground (on top of interval poll):
useEffect(() => AppState.addEventListener('change',
  s => { if (s === 'active') client.updateToggles(); }).remove, [client]);
```

`userId` comes from `AuthContext` — the same identity analytics uses — so a
gradual-rollout / role / gender constraint is stable per user across launches.

## Using a flag

```ts
// src/hooks/useFeatureFlag.ts — reads the singleton directly; never throws.
export const useFeatureFlag = (name: string): boolean => { … return enabled; };
```

```tsx
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { FLAGS } from '../services/featureFlags';

const showThing = useFeatureFlag(FLAGS.TRENDING_ITEM_DROP);
```

Register every flag name in `FLAGS` (in `featureFlags.tsx` **and** the web
stub) — no raw strings at call sites, same rule as analytics event names.

## The `trending_item_drop` gate (AU-438)

The Home "Trending Drop" card is gated behind the `trending_item_drop` flag,
implemented inside `useActiveTrendingDrop`:

```ts
const flagEnabled = useFeatureFlag(FLAGS.TRENDING_ITEM_DROP);
useQuery({ …, enabled: !!userId && flagEnabled });          // flag OFF ⇒ no fetch
const isVisible = flagEnabled && !!drop && …;               // flag OFF ⇒ card never shows
```

- **Flag OFF** ⇒ the `GET /trending-drop/active` call is short-circuited (cheap)
  **and** `isVisible` is `false`, so `HomeScreen` never renders the card. No
  code change was needed on `HomeScreen` — the existing
  `trending.isVisible && trending.drop` guard already handles it.
- **Flag ON** ⇒ the query runs and the card appears when there is an active,
  unanswered drop. A rollout flip is picked up on the next poll / foreground.

## Web handling

The web-preview / sandbox (vite, `react-native-web`) resolves the `.web`
variants first (`featureFlags.web.tsx`, `useFeatureFlag.web.ts`), so the Unleash
RN SDK — and its native `react-native-get-random-values` / AsyncStorage deps —
**never enter the web bundle**. On web every flag is OFF, so flag-gated features
(the Trending Drop card included) don't render there. Verified: `yarn web:build`
succeeds and the built bundle contains no Unleash SDK symbols.

> If a designer needs to preview a flag-gated feature in the sandbox, flip the
> return in `useFeatureFlag.web.ts` to `true` locally on a throwaway branch — do
> not commit that.

## Activation — what's still needed

The integration is merged non-blocking; to make flags actually resolve **ON**:

1. **Frontend token — already embedded.** The dev/prod Frontend tokens are
   embedded per-env in `src/config/unleash.ts` (`__DEV__` split, same pattern as
   `config/env.ts`), because this app has no build-time env injector — a
   `process.env` read resolves to `''` on native, so the flag could never turn
   ON. Frontend tokens are read-only + env-scoped (low-priv, client-embeddable),
   so this is the same risk class as the Mixpanel token already in
   `config/analytics.ts`. Nothing to do here.
2. **Create + enable the flag in the Unleash admin.** Admin UI
   (`https://primary-production-ee649.up.railway.app`) → project `default` →
   *New feature flag* → name it `trending_item_drop`, type `release` → enable the
   `development` (and later `production`) environment; add a Gradual-rollout
   strategy with stickiness = `userId` for a phased launch.
3. **Link the new native module.** `react-native-get-random-values` is a native
   dep — run `yarn pods` and a native rebuild so the crypto polyfill binds.
   (Coordinate: pods / native rebuild disrupt other concurrent sim sessions —
   see `.claude/rules/ios-build-workflow-required.md`.)

Sanity-check the raw API:

```bash
curl -s https://primary-production-ee649.up.railway.app/api/frontend \
  -H "Authorization: <DEV_FRONTEND_TOKEN>" | python3 -m json.tool
```

## Admin UI cheat-sheet

- **Create a flag**: project `default` → *New feature flag* → `snake_case` name →
  register it in `FLAGS`.
- **On/off per environment**: dev builds read `development`, release builds read
  `production` — toggle independently.
- **Gradual rollout**: flag → environment → *Add strategy* → Gradual rollout →
  set % + stickiness `userId`.
- **Target a segment**: constrain on a context field passed by the bridge
  (currently `userId`; extend `updateContext` to add `role` / `gender` etc.).
- **New / rotated token**: *Settings → API access → New API token* → type
  **Frontend** → paste into `DEV_CLIENT_KEY` / `PROD_CLIENT_KEY` in
  `src/config/unleash.ts`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Flags always `false` | Empty key (`UNLEASH_ENABLED` false), or native crypto module not linked (`yarn pods` + rebuild), or flag not enabled for this env. |
| `401` from `/api/frontend` | Wrong token type — must be a **Frontend** token, matching env. |
| Web build breaks importing the SDK | A native-only module was imported without a `.web` counterpart. Keep SDK imports confined to `featureFlags.tsx` / `useFeatureFlag.ts`. |
| Flags stale | Lower `UNLEASH_REFRESH_INTERVAL`, or confirm the foreground-refresh bridge is mounted. |

## Analytics reminder

Feature flags are infra, but any user-facing feature they gate still needs its
own Mixpanel events (`.claude/rules/analytics-tracking-required.md`). The
Trending Drop card already ships its events (`trending_drop_viewed` / `_added` /
`_dismissed`); the flag gate adds no new interaction, so no new events.
