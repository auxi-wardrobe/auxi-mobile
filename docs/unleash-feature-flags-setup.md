# Unleash Feature Flags — Mobile Setup (auxi)

> How to wire the Auxi React Native app to the self-hosted Unleash server for
> feature flags / gradual rollouts / kill-switches. Uses the official
> **`@unleash/unleash-react-native-sdk`** (RN-native storage, no browser-crypto
> pitfall). Mirrors the existing `analytics.ts` "single seam" pattern — screens
> /hooks never import the Unleash SDK directly.

## What was provisioned (server side)

The Unleash server is already running on Railway (project `lively-adventure`):

| Thing | Value |
|---|---|
| Admin UI | `https://primary-production-ee649.up.railway.app` |
| **Frontend API** (what the app calls) | `https://primary-production-ee649.up.railway.app/api/frontend` |
| Environments | `development`, `production` (both enabled) |
| Default project | `default` |
| Example flag (for verifying) | `auxi_example_flag` — enabled in dev + prod |

Admin login + the two **frontend tokens** (dev / prod) were handed over out-of-band
(chat / password manager). They are **not** stored in this doc. See
[Credentials](#credentials--where-tokens-live).

### Why the *frontend* token (and not a client/server token)

Unleash has three token types. A mobile app is an **untrusted client**, so it gets
the least-privileged one:

| Token type | Endpoint | Use it in the app? |
|---|---|---|
| **Frontend** (`*:development.xxx`) | `/api/frontend` | ✅ Yes — read-only, evaluated server-side, env-scoped. Safe to ship in a client bundle. |
| Client (type=client) | `/api/client` | ❌ No — for trusted backends; ships the full ruleset. |
| Admin (`*.xxx`) | `/api/admin` | ❌ No — full read/write. Server-only. |

The Frontend API evaluates strategies on the server and returns only the
on/off result + variant per flag — no rules leak to the device.

## Architecture

```
auxi (RN)
  └─ @unleash/unleash-react-native-sdk (UnleashClient singleton)
        │ GET /api/frontend   Authorization: <frontend-token>
        ▼
  Unleash server (Railway)  ──►  Postgres
        ▲
  Admin UI: create flags, set rollout %, target by user.id / role
```

The client **polls** `/api/frontend` every `refreshInterval` seconds and caches
the result in `AsyncStorage` (via the SDK's `defaultStorageProvider`), so flags
work offline / at cold start from the last known values.

### Why this SDK (not the web proxy client)

`@unleash/unleash-react-native-sdk` wraps `unleash-proxy-client` but ships an
**RN-native AsyncStorage provider** and avoids the browser `crypto.getRandomValues`
pitfall the web bindings (`@unleash/proxy-client-react`) hit in React Native. It
re-exports the same hooks, so the API is identical.

---

## Prerequisites

- Node 20 (`nvm use 20`) — auxi requires it; the default shell Node breaks yarn.
- `@react-native-async-storage/async-storage` is already a dependency (the SDK's
  `defaultStorageProvider` uses it).

## Step 1 — Install the SDK

```bash
cd auxi
nvm use 20
# RN SDK + its required peer (unleash-proxy-client). --ignore-engines: a pre-existing
# transitive dep declares node >=20.19.x; auxi only needs node >=20.
yarn add @unleash/unleash-react-native-sdk unleash-proxy-client --ignore-engines
```

Pure-JS, **no native modules** → no `pod install` needed. `unleash-proxy-client` is
a peer dependency of the RN SDK, so it must be a direct dep too.

## Step 2 — Config (`src/config/unleash.ts`)

Mirror `src/config/env.ts` and `src/config/analytics.ts`: split by `__DEV__`,
keep tokens in one place. **Paste the real frontend tokens** (handed over
separately) where shown.

```ts
// src/config/unleash.ts
//
// Unleash frontend connection config. Split by build mode, same as env.ts.
// The dev/prod tokens are FRONTEND tokens (read-only, env-scoped) — same risk
// class as the Mixpanel token already in config/analytics.ts. Prefer moving
// these to react-native-config / .env when that work lands (see CLAUDE.md TODO).

const UNLEASH_HOST = 'https://primary-production-ee649.up.railway.app';

// The Frontend API endpoint the client polls.
export const UNLEASH_URL = `${UNLEASH_HOST}/api/frontend`;

// Frontend tokens — env-scoped. PASTE the real values here.
const DEV_CLIENT_KEY = 'PASTE_DEV_FRONTEND_TOKEN'; // *:development.xxxxxxxx
const PROD_CLIENT_KEY = 'PASTE_PROD_FRONTEND_TOKEN'; // *:production.xxxxxxxx

export const UNLEASH_CLIENT_KEY = __DEV__ ? DEV_CLIENT_KEY : PROD_CLIENT_KEY;

// Identifies this app in Unleash metrics + scopes metric counts.
export const UNLEASH_APP_NAME = 'auxi';

// Poll cadence (seconds). 30s is a good default; lower = fresher but chattier.
export const UNLEASH_REFRESH_INTERVAL = 30;
```

> The token already encodes its environment (`*:development.…` vs `*:production.…`),
> so `__DEV__` picks the matching one automatically — dev builds read dev flags,
> release builds read prod flags.

## Step 3 — The seam (`src/services/feature-flags.ts`)

Single integration point, exactly like `analytics.ts`. Owns the singleton client,
the flag-name constants, and `identify` / `reset` so `AuthContext` keys rollouts
on the real user — without any screen importing the SDK. Storage comes from the
SDK's `defaultStorageProvider` (AsyncStorage-backed) — no hand-rolled provider.

```ts
// src/services/feature-flags.ts
//
// Feature-flag seam — backed by Unleash (@unleash/unleash-react-native-sdk).
// Single integration point: components use the `useFeatureFlag` hook; AuthContext
// calls identifyFlagUser / resetFlagUser. Nothing else imports the SDK.

import {
  UnleashClient,
  defaultStorageProvider as AsyncStorageProvider,
} from '@unleash/unleash-react-native-sdk';
import {
  UNLEASH_URL,
  UNLEASH_CLIENT_KEY,
  UNLEASH_APP_NAME,
  UNLEASH_REFRESH_INTERVAL,
} from '../config/unleash';

// Flag names as literal constants — no magic strings at call sites (same rule
// as analytics event names). Add every new flag here.
export const FLAGS = {
  EXAMPLE: 'auxi_example_flag',
} as const;

export type FlagName = (typeof FLAGS)[keyof typeof FLAGS];

// Singleton client. FlagProvider in App.tsx starts it. `defaultStorageProvider`
// is the SDK's AsyncStorage-backed class — instantiate it for RN persistence.
export const unleashClient = new UnleashClient({
  url: UNLEASH_URL,
  clientKey: UNLEASH_CLIENT_KEY,
  appName: UNLEASH_APP_NAME,
  refreshInterval: UNLEASH_REFRESH_INTERVAL,
  storageProvider: new AsyncStorageProvider(),
});

if (__DEV__) {
  unleashClient.on('error', (err: unknown) =>
    console.warn('[unleash] error', err),
  );
}

// Re-fetch toggles for a new context, fire-and-forget. Best-effort: a failed
// fetch leaves the last-known cache in place and the poll loop retries. We
// swallow (log in dev) — callers never await an identity change. (`.catch`
// not `void`: ESLint `no-void` rejects the void form.)
const applyContext = (
  context: Parameters<UnleashClient['updateContext']>[0],
) => {
  unleashClient.updateContext(context).catch(err => {
    if (__DEV__) {
      console.warn('[unleash] updateContext failed', err);
    }
  });
};

// Attach the logged-in user so % rollouts / targeting are stable per user.
export const identifyFlagUser = (user: {
  id: number | string;
  email?: string;
  role?: string;
  gender?: string | null;
}): void => {
  applyContext({
    userId: String(user.id),
    properties: {
      ...(user.role ? { role: user.role } : {}),
      ...(user.gender ? { gender: user.gender } : {}),
    },
  });
};

// Clear identity on logout → back to anonymous evaluation.
export const resetFlagUser = (): void => {
  applyContext({ userId: undefined, properties: {} });
};
```

> **Why `userId`?** Unleash's gradual-rollout strategy hashes a stable id so a
> user stays on the same side of a 25% rollout across launches. Anonymous users
> get a random sticky session id automatically.

## Step 4 — Wire the provider (`App.tsx`)

`FlagProvider` must wrap the screens, and sit **inside** `AuthProvider` so the
user-identify call (Step 5) has somewhere to render. Pass the singleton client
(the RN SDK's `FlagProvider` accepts `unleashClient` as well as `config`):

```diff
  import { AuthProvider } from './src/context/AuthContext';
+ import { FlagProvider } from '@unleash/unleash-react-native-sdk';
+ import { unleashClient } from './src/services/feature-flags';
```

```diff
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
-           <SidebarProvider>
-             <RootDrawer>
-               <AppNavigator />
-             </RootDrawer>
-           </SidebarProvider>
+           <FlagProvider unleashClient={unleashClient}>
+             <SidebarProvider>
+               <RootDrawer>
+                 <AppNavigator />
+               </RootDrawer>
+             </SidebarProvider>
+           </FlagProvider>
          </AuthProvider>
          <Toast />
        </QueryClientProvider>
```

`FlagProvider` calls `unleashClient.start()` automatically on mount (begins
polling). No manual start needed.

## Step 5 — Identify the user (`src/context/AuthContext.tsx`)

Call the seam right next to the existing `identifyUser` / `resetAnalytics` calls
so flags and analytics share the same identity lifecycle:

```diff
+ import { identifyFlagUser, resetFlagUser } from '../services/feature-flags';
```

```diff
  // on successful login / cold-start hydrate, where you call:
  identifyUser(distinctId, profile, superProps);
+ identifyFlagUser(user);
```

```diff
  // on logout, where you call:
  resetAnalytics();
+ resetFlagUser();
```

## Step 6 — Use a flag

Wrap the lib hook so call sites use the `FLAGS` constants, never raw strings:

```ts
// src/hooks/useFeatureFlag.ts
import {
  useFlag,
  useVariant,
  useFlagsStatus,
} from '@unleash/unleash-react-native-sdk';
import type { FlagName } from '../services/feature-flags';

export const useFeatureFlag = (name: FlagName): boolean => useFlag(name);
export const useFeatureVariant = (name: FlagName) => useVariant(name);

// True once the first toggle fetch has resolved — gate UI on this to avoid a
// flash of the wrong variant at cold start.
export const useFlagsReady = (): boolean => useFlagsStatus().flagsReady;
```

In a screen:

```tsx
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { FLAGS } from '../services/feature-flags';

const showNewHome = useFeatureFlag(FLAGS.EXAMPLE);
return showNewHome ? <NewHome /> : <HomeScreen />;
```

Avoid a wrong-variant flash on the very first launch (no cache yet):

```tsx
import { useFlagsReady } from '../hooks/useFeatureFlag';
const ready = useFlagsReady();
if (!ready) return <ActivityIndicator />; // last-known cache is instant after first run
```

## Step 7 — Refresh on foreground (optional but recommended)

Polling already keeps flags fresh every `refreshInterval`. To also refresh the
instant the user returns to the app, force a re-fetch on `AppState` active:

```ts
// src/hooks/useUnleashForegroundRefresh.ts
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useUnleashClient } from '@unleash/unleash-react-native-sdk';

export const useUnleashForegroundRefresh = (): void => {
  const client = useUnleashClient();
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        // Re-evaluating with the same context triggers a fresh fetch.
        // Fire-and-forget: a failed refresh keeps the last-known cache.
        client.updateContext(client.getContext()).catch(() => {
          // Non-fatal — interval polling will retry.
        });
      }
    });
    return () => sub.remove();
  }, [client]);
};
```

Mounted once in `AppNavigator` (renders under `FlagProvider`).

## Step 8 — Verify end-to-end

1. `nvm use 20 && yarn ios:sim` (bring up the stack with `./scripts/qa-boot.sh`
   from the umbrella root if you need the backend too).
2. Render `useFeatureFlag(FLAGS.EXAMPLE)` somewhere — it should be **`true`**
   (the example flag is enabled in dev).
3. In the Admin UI → project `default` → `auxi_example_flag` → **disable** the
   `development` environment → within `refreshInterval` (≤30s) the app flips to
   `false`. Re-enable → flips back. That round-trip proves the wiring.

Sanity-check the raw API any time:

```bash
curl -s https://primary-production-ee649.up.railway.app/api/frontend \
  -H "Authorization: <DEV_FRONTEND_TOKEN>" | python3 -m json.tool
```

---

## Admin UI cheat-sheet

Log in at the Admin UI, then:

- **Create a flag**: project `default` → *New feature flag* → name it `snake_case`
  (e.g. `home_v2`, `tryon_kill_switch`). Type `release` for features, `kill-switch`
  for emergency-off. Then **register the name in `FLAGS`** in `feature-flags.ts`.
- **Turn on/off per environment**: open the flag → toggle `development` /
  `production` independently. Dev builds read dev, release builds read prod.
- **Gradual rollout**: flag → environment → *Add strategy* → **Gradual rollout** →
  set % and stickiness = `userId` (stable per logged-in user — that's why Step 5
  sets it).
- **Target a segment**: add a constraint on a context field you pass, e.g.
  `role IS admin` or `gender IS male` (both are sent from `identifyFlagUser`).
- **Variants (A/B)**: flag → *Variants* → add variants with weights → read with
  `useFeatureVariant(FLAGS.X)`.
- **New / rotated token**: *Settings → API access → New API token* → type
  **Frontend**, environment dev or prod, projects `*` → paste into
  `src/config/unleash.ts`.

## Credentials & where tokens live

- Admin login + dev/prod frontend tokens were delivered out-of-band — store them
  in your password manager, **not** in this doc.
- The frontend tokens go in `src/config/unleash.ts` (Step 2). They are low-priv
  client keys (same class as the Mixpanel token already in `config/analytics.ts`),
  but the cleaner long-term home is `react-native-config` / `.env` once that TODO
  (see `auxi/CLAUDE.md`) lands. Don't put the **admin** password in the repo ever.
- To rotate a leaked frontend token: Admin UI → API access → delete the token →
  create a new Frontend token → update `src/config/unleash.ts`.

## Analytics rule reminder

Feature flags are infra, but any **user-facing feature** they gate still needs its
own Mixpanel events per `.claude/rules/analytics-tracking-required.md`. If you want
to measure exposure (who saw which variant), enable **impression data** on the flag
and forward `unleashClient.on('impression', …)` into `analytics.track(...)` — keep
it in the seam, no PII.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Flags always `false` / `flagsReady` never true | Wrong/expired token, or token env ≠ build env. Re-check `src/config/unleash.ts`; test with the `curl` above. |
| `401` from `/api/frontend` | Token revoked or you used a client/admin token. Generate a **Frontend** token. |
| Flags stale | Lower `UNLEASH_REFRESH_INTERVAL`, or confirm Step 7 foreground refresh is mounted. |
| `yarn add` fails on engine check | Add `--ignore-engines` (a transitive dep wants a newer Node 20 patch; auxi only needs node >=20). |
| Peer-dep warning `unleash-proxy-client` unmet | It's a peer of the RN SDK — ensure it's a direct dep (Step 1 installs both). |

## Files added/changed (summary)

| File | Change |
|---|---|
| `package.json` | + `@unleash/unleash-react-native-sdk`, `unleash-proxy-client` |
| `src/config/unleash.ts` | **new** — URL, tokens, app name, refresh interval |
| `src/services/feature-flags.ts` | **new** — client singleton + `FLAGS` + identify/reset (SDK `defaultStorageProvider`) |
| `src/hooks/useFeatureFlag.ts` | **new** — typed flag hooks |
| `src/hooks/useUnleashForegroundRefresh.ts` | **new** (optional) — AppState refresh |
| `App.tsx` | wrap tree in `<FlagProvider>` (inside `AuthProvider`) |
| `src/context/AuthContext.tsx` | call `identifyFlagUser` / `resetFlagUser` |
| `src/navigation/AppNavigator.tsx` | mount `useUnleashForegroundRefresh()` |
