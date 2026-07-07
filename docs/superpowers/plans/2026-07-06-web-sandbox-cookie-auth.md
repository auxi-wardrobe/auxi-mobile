# Web Sandbox Cookie Auto-Login + Admin Impersonation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed-account web-sandbox proxy with real login persisted in a cross-subdomain cookie, plus an ephemeral `?token=` param for admin impersonation inside an iframe.

**Architecture:** All app auth already funnels through `tokenStorage`. The web `tokenStorage.web.ts` gains a shared-cookie mirror (login/refresh/logout propagate automatically) + a hydrate helper + an ephemeral-mode guard. `index.web.tsx` boot picks: `?token=` → ephemeral impersonation; else adopt the shared cookie; else real login screen. The Cloudflare Pages Function proxy becomes a plain pass-through (forwards the client's `Authorization`, no injected credentials).

**Tech Stack:** React Native Web (Vite build), TypeScript, Jest (react-native preset, node env), Cloudflare Pages Functions (Web `fetch`/`Headers` APIs).

## Global Constraints

- **Web-only changes.** Native `tokenStorage.ts` gets no behavior change; new functions are web-file additions. Metro/native auth is untouched.
- **Spec:** `docs/superpowers/specs/2026-07-06-web-sandbox-cookie-auth-and-admin-impersonation-design.md`.
- **Shared cookie name:** `AUXI_SESSION`. Attrs: `Path=/; Secure; SameSite=Lax; Max-Age=<refresh expiry seconds, fallback 2592000>; Domain=<registrable domain when host ends with .pages.dev, else omitted>`.
- **Cookie value:** `encodeURIComponent(JSON.stringify({ access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, user_email }))`. Expiries are **epoch seconds**.
- **Impersonation param:** `?token=<access-only JWT>` → ephemeral (localStorage only), stripped from URL on consume, param takes precedence over the cookie.
- **No new deps** (do not add `jest-environment-jsdom`; stub globals in tests).
- **Commit style:** conventional commits, **no AI references** in messages (repo rule).
- **No PII / no secrets in code.** Proxy holds no credentials after this change.
- **Verification gate (whole feature):** `npx tsc --noEmit` clean; `yarn lint` no new errors/warnings; `yarn test` green; `yarn web:build` succeeds.

---

### Task 1: Shared-cookie mirror + hydrate + ephemeral mode in `tokenStorage.web.ts`

**Files:**
- Modify: `src/services/tokenStorage.web.ts` (full rewrite below)
- Test: `src/services/__tests__/tokenStorage.web.test.ts` (create)

**Interfaces:**
- Consumes: `StoredTokenData` from `src/types/auth`.
- Produces (new exports, web-only):
  - `setTokens(input: SetTokensInput): Promise<void>` — now also mirrors the shared cookie (unless ephemeral).
  - `clearTokens(): Promise<void>` — now also deletes the shared cookie (unless ephemeral).
  - `hydrateFromSharedCookie(): Promise<boolean>` — seed localStorage from the cookie when empty; returns whether a session was hydrated.
  - `enableEphemeralMode(): void` — after this, `setTokens`/`clearTokens` skip all cookie ops for the page's lifetime.
  - Unchanged: `getAccessToken`, `getRefreshToken`, `getStoredEmail`, `getStoredTokens`, `migrateLegacyKeychain`, `SetTokensInput`.

- [ ] **Step 1: Write the failing test**

Create `src/services/__tests__/tokenStorage.web.test.ts`:

```ts
/**
 * Runs in the default (node) jest env — no jsdom installed. We stub the three
 * browser globals the web token store touches: localStorage, document.cookie,
 * location.hostname. jest.resetModules() re-evaluates the module each test so
 * the module-level ephemeral flag resets to false.
 */
class MemStorage {
  store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

// Minimal cookie jar: honours Max-Age=0 as delete, records raw set strings so
// tests can assert on attributes (Domain, Secure, …).
function makeCookieJar() {
  const jar = new Map<string, string>();
  const raw: string[] = [];
  return {
    raw,
    get cookie() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    set cookie(str: string) {
      raw.push(str);
      const [pair, ...attrs] = str.split('; ');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq);
      const val = pair.slice(eq + 1);
      const maxAge = attrs.find(a => a.toLowerCase().startsWith('max-age='));
      if (maxAge && maxAge.split('=')[1] === '0') jar.delete(name);
      else jar.set(name, val);
    },
  };
}

const nowSec = () => Math.floor(Date.now() / 1000);
let jar: ReturnType<typeof makeCookieJar>;
let store: MemStorage;

function loadModule(hostname = 'abc123.auxi-web-review.pages.dev') {
  jest.resetModules();
  store = new MemStorage();
  jar = makeCookieJar();
  (global as any).localStorage = store;
  (global as any).document = jar;
  (global as any).location = { hostname };
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../tokenStorage.web');
}

const bundle = () => ({
  access_token: 'acc-1',
  refresh_token: 'ref-1',
  access_token_expires_at: nowSec() + 900,
  refresh_token_expires_at: nowSec() + 60 * 60 * 24 * 7,
  user_email: 'x@test',
});

describe('tokenStorage.web shared cookie', () => {
  it('setTokens writes localStorage AND a Domain-scoped shared cookie', async () => {
    const m = loadModule();
    await m.setTokens(bundle());
    expect(await m.getAccessToken()).toBe('acc-1');
    expect(jar.cookie).toContain('AUXI_SESSION=');
    const raw = jar.raw.join('\n');
    expect(raw).toContain('Domain=auxi-web-review.pages.dev');
    expect(raw).toContain('Secure');
    expect(raw).toContain('SameSite=Lax');
  });

  it('omits Domain on non-pages.dev hosts (localhost dev)', async () => {
    const m = loadModule('localhost');
    await m.setTokens(bundle());
    expect(jar.raw.join('\n')).not.toContain('Domain=');
  });

  it('clearTokens removes the shared cookie and localStorage', async () => {
    const m = loadModule();
    await m.setTokens(bundle());
    await m.clearTokens();
    expect(await m.getAccessToken()).toBeNull();
    expect(jar.cookie).not.toContain('AUXI_SESSION=');
  });

  it('ephemeral mode: setTokens writes localStorage but NOT the cookie', async () => {
    const m = loadModule();
    m.enableEphemeralMode();
    await m.setTokens({ access_token: 'imp-1' });
    expect(await m.getAccessToken()).toBe('imp-1');
    expect(jar.cookie).not.toContain('AUXI_SESSION=');
  });

  it('hydrateFromSharedCookie seeds localStorage from a valid cookie', async () => {
    // Session A writes the cookie.
    const a = loadModule();
    await a.setTokens(bundle());
    const cookieValue = jar.cookie;

    // Fresh "subdomain": empty localStorage, same shared cookie present.
    const b = loadModule();
    (global as any).document = {
      get cookie() { return cookieValue; },
      set cookie(_s: string) {},
    };
    const hydrated = await b.hydrateFromSharedCookie();
    expect(hydrated).toBe(true);
    expect(await b.getAccessToken()).toBe('acc-1');
  });

  it('hydrateFromSharedCookie ignores an expired session', async () => {
    const m = loadModule();
    const dead = { ...bundle(), access_token_expires_at: nowSec() - 10,
      refresh_token_expires_at: nowSec() - 10 };
    (global as any).document = {
      get cookie() {
        return 'AUXI_SESSION=' + encodeURIComponent(JSON.stringify(dead));
      },
      set cookie(_s: string) {},
    };
    expect(await m.hydrateFromSharedCookie()).toBe(false);
    expect(await m.getAccessToken()).toBeNull();
  });

  it('hydrateFromSharedCookie is a no-op when localStorage already has a token', async () => {
    const m = loadModule();
    await m.setTokens(bundle());
    expect(await m.hydrateFromSharedCookie()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest src/services/__tests__/tokenStorage.web.test.ts`
Expected: FAIL — `enableEphemeralMode`/`hydrateFromSharedCookie` are not functions yet, cookie assertions fail.

- [ ] **Step 3: Rewrite `src/services/tokenStorage.web.ts`**

```ts
import type { StoredTokenData } from '../types/auth';

const KEY = (f: string) => `AUXI_AUTH/${f}`;

/** Shared cross-subdomain session cookie for the web-preview sandbox. */
const SHARED_COOKIE = 'AUXI_SESSION';
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 30; // 30d fallback

export interface SetTokensInput {
  access_token: string;
  refresh_token?: string | null;
  access_token_expires_at?: number | null;
  refresh_token_expires_at?: number | null;
  user_email?: string | null;
}

// When enabled (admin impersonation iframe), ALL shared-cookie writes/deletes
// are skipped so the ephemeral session never touches the designer's cookie.
let ephemeral = false;
export const enableEphemeralMode = (): void => { ephemeral = true; };

const write = (f: string, v: string | null | undefined) => {
  if (v === undefined) return;
  if (v === null) localStorage.removeItem(KEY(f));
  else localStorage.setItem(KEY(f), v);
};
const read = (f: string): string | null => localStorage.getItem(KEY(f));

const nowSec = () => Math.floor(Date.now() / 1000);

/** Registrable domain for the shared cookie, or undefined for a host-only
 * cookie (e.g. localhost dev). `pages.dev` is a public suffix, so the
 * registrable domain is the last three labels (`auxi-web-review.pages.dev`). */
const sharedCookieDomain = (): string | undefined => {
  const host = typeof location !== 'undefined' ? location.hostname : '';
  if (host.endsWith('.pages.dev')) return host.split('.').slice(-3).join('.');
  return undefined;
};

const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined' || !document.cookie) return null;
  for (const part of document.cookie.split('; ')) {
    const eq = part.indexOf('=');
    if (eq > -1 && part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
};

const writeSharedCookie = (b: StoredTokenData): void => {
  if (ephemeral || typeof document === 'undefined') return;
  const ttl = (b.refresh_token_expires_at || 0) - nowSec();
  const maxAge = ttl > 0 ? ttl : DEFAULT_MAX_AGE;
  const attrs = [
    `${SHARED_COOKIE}=${encodeURIComponent(JSON.stringify(b))}`,
    'Path=/', 'Secure', 'SameSite=Lax', `Max-Age=${maxAge}`,
  ];
  const domain = sharedCookieDomain();
  if (domain) attrs.push(`Domain=${domain}`);
  document.cookie = attrs.join('; ');
};

const deleteSharedCookie = (): void => {
  if (ephemeral || typeof document === 'undefined') return;
  const attrs = [`${SHARED_COOKIE}=`, 'Path=/', 'Max-Age=0'];
  const domain = sharedCookieDomain();
  if (domain) attrs.push(`Domain=${domain}`);
  document.cookie = attrs.join('; ');
};

export const setTokens = async (input: SetTokensInput): Promise<void> => {
  write('access_token', input.access_token);
  write('refresh_token', input.refresh_token);
  if (input.access_token_expires_at != null)
    write('access_token_expires_at', String(input.access_token_expires_at));
  if (input.refresh_token_expires_at != null)
    write('refresh_token_expires_at', String(input.refresh_token_expires_at));
  write('user_email', input.user_email);
  writeSharedCookie({
    access_token: input.access_token,
    refresh_token: input.refresh_token ?? '',
    access_token_expires_at: input.access_token_expires_at ?? 0,
    refresh_token_expires_at: input.refresh_token_expires_at ?? 0,
    user_email: input.user_email ?? '',
  });
};

export const getAccessToken = async (): Promise<string | null> => read('access_token');
export const getRefreshToken = async (): Promise<string | null> => read('refresh_token');
export const getStoredEmail = async (): Promise<string | null> => read('user_email');

export const getStoredTokens = async (): Promise<StoredTokenData | null> => {
  const access_token = read('access_token');
  if (!access_token) return null;
  return {
    access_token,
    refresh_token: read('refresh_token') ?? '',
    access_token_expires_at: Number(read('access_token_expires_at') ?? 0),
    refresh_token_expires_at: Number(read('refresh_token_expires_at') ?? 0),
    user_email: read('user_email') ?? '',
  };
};

export const clearTokens = async (): Promise<void> => {
  ['access_token', 'refresh_token', 'access_token_expires_at',
   'refresh_token_expires_at', 'user_email'].forEach(f => localStorage.removeItem(KEY(f)));
  deleteSharedCookie();
};

/**
 * Adopt a cross-subdomain sandbox session from the shared cookie when this
 * origin's localStorage is empty. Returns true if a session was hydrated.
 * Skips dead sessions (both access + refresh past expiry).
 */
export const hydrateFromSharedCookie = async (): Promise<boolean> => {
  if (read('access_token')) return false;
  const raw = readCookie(SHARED_COOKIE);
  if (!raw) return false;
  let b: StoredTokenData;
  try { b = JSON.parse(decodeURIComponent(raw)); } catch { return false; }
  if (!b || !b.access_token) return false;
  const exp = b.refresh_token_expires_at || b.access_token_expires_at || 0;
  if (exp && exp <= nowSec()) return false;
  await setTokens(b);
  return true;
};

export const migrateLegacyKeychain = async (): Promise<void> => {};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn jest src/services/__tests__/tokenStorage.web.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (legacy `_HomeScreen.tsx` errors are pre-existing and expected per `auxi/CLAUDE.md`).

- [ ] **Step 6: Commit**

```bash
git add src/services/tokenStorage.web.ts src/services/__tests__/tokenStorage.web.test.ts
git commit -m "feat(sandbox): shared-cookie session mirror + hydrate + ephemeral mode (web)"
```

---

### Task 2: `?token=` param helpers

**Files:**
- Create: `web/boot/tokenParam.ts`
- Test: `web/boot/__tests__/tokenParam.test.ts`

**Interfaces:**
- Produces:
  - `TOKEN_PARAM = 'token'`
  - `parseTokenParam(search: string): string | null` — non-empty `?token=` value or null.
  - `stripTokenFromUrl(): void` — removes `token` from the current URL via `history.replaceState`, keeping other params.

- [ ] **Step 1: Write the failing test**

Create `web/boot/__tests__/tokenParam.test.ts`:

```ts
import { parseTokenParam, TOKEN_PARAM } from '../tokenParam';

describe('parseTokenParam', () => {
  it('reads a non-empty token param', () => {
    expect(parseTokenParam('?embed=1&token=abc.def')).toBe('abc.def');
    expect(parseTokenParam(`?${TOKEN_PARAM}=xyz`)).toBe('xyz');
  });
  it('returns null when absent or empty', () => {
    expect(parseTokenParam('')).toBeNull();
    expect(parseTokenParam('?embed=1')).toBeNull();
    expect(parseTokenParam('?token=')).toBeNull();
  });
  it('returns null on malformed input', () => {
    expect(parseTokenParam('%')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest web/boot/__tests__/tokenParam.test.ts`
Expected: FAIL — `Cannot find module '../tokenParam'`.

- [ ] **Step 3: Create `web/boot/tokenParam.ts`**

```ts
/**
 * Web-only helpers for the admin-impersonation `?token=` param. The app reads
 * an access-only user JWT from the URL, seeds an ephemeral session, and strips
 * the param so it does not linger in history / on copy.
 */
export const TOKEN_PARAM = 'token';

export const parseTokenParam = (search: string): string | null => {
  try {
    const v = new URLSearchParams(search).get(TOKEN_PARAM);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
};

/** Remove `?token=` from the current URL without a reload (keeps other params). */
export const stripTokenFromUrl = (): void => {
  if (typeof location === 'undefined' || typeof history === 'undefined') return;
  const qs = new URLSearchParams(location.search);
  if (!qs.has(TOKEN_PARAM)) return;
  qs.delete(TOKEN_PARAM);
  const q = qs.toString();
  history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn jest web/boot/__tests__/tokenParam.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add web/boot/tokenParam.ts web/boot/__tests__/tokenParam.test.ts
git commit -m "feat(sandbox): impersonation token param parse/strip helpers"
```

---

### Task 3: Boot precedence in `index.web.tsx`

**Files:**
- Modify: `index.web.tsx` (full rewrite below)

**Interfaces:**
- Consumes: `enableEphemeralMode`, `hydrateFromSharedCookie`, `setTokens` from `./src/services/tokenStorage.web` (explicit `.web` path so tsc resolves the web exports, not the native `tokenStorage.ts`); `parseTokenParam`, `stripTokenFromUrl` from `./web/boot/tokenParam`.

> **Why this task has no unit test:** `index.web.tsx` imports `App` (the whole RN tree); it is an integration entry point. Its pure pieces are covered by Tasks 1–2. Verify via typecheck + build + the manual matrix below.

> **Behavior note (intended):** removing `seedMockAuth` means a fresh visitor with no shared cookie now sees the **real login screen** instead of auto-populated duc2820 data. `?screen=` share-links likewise require a real session (cookie present). This is the approved "drop forced duc2820" outcome.

- [ ] **Step 1: Rewrite `index.web.tsx`**

```tsx
import './web/fonts.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  setForcedFirstLogin,
  setPendingNavIntent,
} from './src/services/reviewOverrides';
import {
  enableEphemeralMode,
  hydrateFromSharedCookie,
  setTokens,
} from './src/services/tokenStorage.web';
import { parseTokenParam, stripTokenFromUrl } from './web/boot/tokenParam';
import { authStateForSearch, screenForSearch } from './web/share/screen-intent';
import { DeviceFrame } from './web/device-frame/DeviceFrame';
import App from './App';

const isEmbed =
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search).has('embed');

async function boot() {
  const root = createRoot(document.getElementById('root')!);
  if (!isEmbed) {
    root.render(<DeviceFrame />);
    return;
  }

  const search = typeof location !== 'undefined' ? location.search : '';
  const authState = authStateForSearch(search);
  const screen = screenForSearch(search);
  // Hand the requested landing screen to the navigator (applied on ready).
  if (screen) setPendingNavIntent(screen.target);
  // Onboarding screens only mount when is_first_login — force it for review.
  if (authState === 'first-login') setForcedFirstLogin(true);

  const paramToken = parseTokenParam(search);
  if (paramToken) {
    // Admin impersonation: ephemeral, localStorage-only, never touch the
    // shared designer cookie. Strip the token from the URL immediately.
    enableEphemeralMode();
    await setTokens({ access_token: paramToken });
    stripTokenFromUrl();
  } else if (authState !== 'logged-out') {
    // Designer flow: adopt a shared cross-subdomain session if one exists;
    // otherwise the app boots unauthenticated and the real login screen mounts.
    await hydrateFromSharedCookie();
  }

  root.render(<App />);
}
boot();
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (If tsc reports the `./src/services/tokenStorage.web` import cannot find the new exports, confirm Step 3 of Task 1 landed those exports.)

- [ ] **Step 3: Lint**

Run: `yarn lint`
Expected: no new errors/warnings (baseline: 4 errors in `_HomeScreen.tsx`, 3 warnings — do not exceed). In particular, no `seedMockAuth`/`MockAuthBoot` unused-import error.

- [ ] **Step 4: Web build smoke**

Run: `yarn web:build`
Expected: build succeeds, emits `dist-web`.

- [ ] **Step 5: Commit**

```bash
git add index.web.tsx
git commit -m "feat(sandbox): cookie auto-login + impersonation-param boot precedence"
```

---

### Task 4: Pass-through Cloudflare Pages Function proxy

**Files:**
- Modify: `functions/api/[[path]].js` (full rewrite below)
- Test: `functions/api/__tests__/proxy.test.js` (create)

**Interfaces:**
- Produces: `onRequest(context)` — forwards `context.request` to the backend, preserving the client `Authorization`, stripping `host` + `cookie`. No credentials, no `env` usage.

- [ ] **Step 1: Write the failing test**

Create `functions/api/__tests__/proxy.test.js`:

```js
// Node 20 provides global fetch/Headers/Request/Response/URL.
const { onRequest } = require('../[[path]].js');

describe('sandbox api proxy (pass-through)', () => {
  let captured;
  beforeEach(() => {
    captured = null;
    global.fetch = jest.fn(async (target, init) => {
      captured = { target, init };
      return new Response('{"ok":true}', { status: 200 });
    });
  });

  it('forwards Authorization, strips cookie, preserves path+query+method', async () => {
    const request = new Request('https://x.auxi-web-review.pages.dev/api/me?y=1', {
      method: 'GET',
      headers: { Authorization: 'Bearer abc', Cookie: 'AUXI_SESSION=zzz' },
    });
    const resp = await onRequest({ request, env: {}, params: { path: ['me'] } });

    expect(resp.status).toBe(200);
    expect(captured.target).toBe(
      'https://wardrobe-backend-production-c8d9.up.railway.app/api/me?y=1',
    );
    expect(captured.init.method).toBe('GET');
    expect(captured.init.headers.get('authorization')).toBe('Bearer abc');
    expect(captured.init.headers.get('cookie')).toBeNull();
  });

  it('forwards a POST body (e.g. login) untouched', async () => {
    const request = new Request('https://x.auxi-web-review.pages.dev/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b', password: 'p' }),
    });
    await onRequest({ request, env: {}, params: { path: ['login'] } });
    expect(captured.target).toBe(
      'https://wardrobe-backend-production-c8d9.up.railway.app/api/login',
    );
    expect(captured.init.method).toBe('POST');
    const sent = Buffer.from(captured.init.body).toString();
    expect(JSON.parse(sent)).toEqual({ email: 'a@b', password: 'p' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest functions/api/__tests__/proxy.test.js`
Expected: FAIL — current proxy calls `env.REVIEW_EMAIL` login (getToken) and overwrites `Authorization`, so `captured.init.headers.get('authorization')` is `Bearer <server token>` / the login fetch fires first.

- [ ] **Step 3: Rewrite `functions/api/[[path]].js`**

```js
// Sandbox API proxy — pass-through. Forwards the client's own Authorization
// header to the backend; holds NO credentials. Auth comes from the shared
// session cookie (mirrored into the app's Authorization) or the impersonation
// ?token=. The sandbox cookie is stripped so it never reaches the backend.
const BACKEND = 'https://wardrobe-backend-production-c8d9.up.railway.app/api';

export async function onRequest(context) {
  const { request, params } = context;
  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path || '');
  const url = new URL(request.url);
  const target = BACKEND + '/' + path + url.search;
  const body = ['GET', 'HEAD'].includes(request.method)
    ? undefined
    : await request.arrayBuffer();

  const h = new Headers(request.headers);
  h.delete('host');
  h.delete('cookie');

  const resp = await fetch(target, { method: request.method, headers: h, body });
  return new Response(resp.body, { status: resp.status, headers: resp.headers });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn jest functions/api/__tests__/proxy.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "functions/api/[[path]].js" functions/api/__tests__/proxy.test.js
git commit -m "refactor(sandbox): proxy pass-through, drop fixed-account credentials"
```

---

### Task 5: Analytics tracking-plan note

**Files:**
- Modify: `docs/analytics/mixpanel-tracking-plan.md` (§6 gaps)

**Interfaces:** none (docs only).

- [ ] **Step 1: Add the note**

Open `docs/analytics/mixpanel-tracking-plan.md`, find §6 (spec'd-but-gap / notes). Append a bullet:

```markdown
- **Web sandbox login (2026-07-06):** the web-preview surface now boots through
  the real login screen (cookie auto-login) / an admin `?token=` impersonation
  param instead of a forced review account. Mixpanel is stubbed on web
  (`web/stubs/mixpanel.ts`), so no auth events fire from the sandbox; impersonation
  auto-boot is not a user action. No new events — re-wire only if web analytics
  is ever un-stubbed. Spec: `docs/superpowers/specs/2026-07-06-web-sandbox-cookie-auth-and-admin-impersonation-design.md`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/analytics/mixpanel-tracking-plan.md
git commit -m "docs(analytics): note web sandbox real-login/impersonation, no new events"
```

---

## Manual verification matrix (run after all tasks, on a deployed preview)

Deploy via the `deploy-auxi-web` skill ("sandbox đi"), then:

1. **Feature 1 — auto-login across previews:** open preview A → real login screen → log in with any account → land on Home. Open a *different* preview URL B (`*.auxi-web-review.pages.dev`) → boots straight to Home as the same account (no login). ✅
2. **Feature 1 — logout propagation:** log out on B → reopen A → login screen again. ✅
3. **Feature 1 — refresh:** wait past access-token TTL (or clear `AUXI_AUTH/access_token_expires_at`) → next action refreshes silently and the app stays logged in; `AUXI_SESSION` cookie value updates. ✅
4. **Feature 2 — impersonation:** open `https://<preview>.auxi-web-review.pages.dev/?embed&token=<access-only user JWT>` → app runs as that user; `document.cookie` shows **no** change to `AUXI_SESSION`; the `token` param is gone from the URL bar. ✅
5. **Feature 2 — isolation:** in the same browser where you're logged in as designer (Feature 1 cookie set), open an impersonation `?token=` URL → the designer `AUXI_SESSION` cookie is unchanged; closing the impersonation tab leaves the designer session intact. ✅
6. **Data path:** confirm `/api/me` returns the expected account (network tab: request carries `Authorization: Bearer …`, no `AUXI_SESSION` cookie forwarded to the backend). ✅

## Post-implementation (ops / cross-repo — not code in this plan)

- Remove `REVIEW_EMAIL` / `REVIEW_PASSWORD` from the Cloudflare Pages project `auxi-web-review` (production + preview scopes) — now unused. (devops.)
- File follow-ups via tech-lead: backend `POST /admin/users/{id}/impersonate` (admin-only, short-TTL access-only token, audit log) and wardrobe-admin user-detail iframe. See spec §7.

---

## Self-Review

- **Spec coverage:** G1 (real login, drop forced account) → Tasks 3 + 4. G2 (cross-subdomain cookie) → Task 1 + boot in Task 3. G3 (ephemeral impersonation param) → Tasks 1 (`enableEphemeralMode`) + 2 + 3. Proxy §5.3 → Task 4. Analytics §5.4 → Task 5. Cross-repo §7 → captured as post-implementation follow-ups (out of scope, flagged). Security §8 (ephemeral guard, strip-from-URL, no creds) → Tasks 1–4. Testing §9 → Tasks 1/2/4 unit + manual matrix.
- **Placeholder scan:** none — all steps carry full code/commands/expected output.
- **Type consistency:** `enableEphemeralMode`/`hydrateFromSharedCookie`/`setTokens` names match across Task 1 (definition), Task 3 (consumption via `.web` import), and tests. Cookie name `AUXI_SESSION` and bundle fields consistent across Task 1 + tests + manual matrix. `onRequest` signature `{ request, params }` matches CF Pages Functions and Task 4 test.
