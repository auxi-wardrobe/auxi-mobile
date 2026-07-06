# Web Sandbox — Cookie Auto-Login + Admin Impersonation via Param

**Date:** 2026-07-06
**Status:** Approved (design) — pending implementation plan
**Scope:** auxi web-preview surface (the "Sandbox"). Backend + admin-SPA parts are cross-repo dependencies, noted but out of this spec's implementation scope.

---

## TL;DR (VN)

Web sandbox hiện proxy ép cứng 1 account (duc2820) cho mọi người. Đổi thành:

1. **Feature 1 — Cookie auto-login (designer):** login thật bằng account bất kỳ → token lưu vào cookie chia sẻ trên `auxi-web-review.pages.dev` → mọi link `*.auxi-web-review.pages.dev` tự login khi thấy token.
2. **Feature 2 — Admin impersonation qua param:** admin panel nhúng sandbox làm iframe ở trang user-detail, truyền `?token=<user-jwt>` → app chạy như user đó. Token **ephemeral** (chỉ localStorage, KHÔNG ghi cookie), param ưu tiên hơn cookie.

Backend cần thêm endpoint mint access-token cho user (admin-only) — cross-repo, qua tech-lead/backend-dev.

---

## 1. Problem & Current State

The web-preview ("Sandbox") is a `react-native-web` build of the app served on Cloudflare Pages so designers/CEO preview UI at a URL. Each deploy is a unique subdomain `<hash>.auxi-web-review.pages.dev`.

**How auth works today (real-proxy mode):**

- `index.web.tsx` (embed mode) calls `seedMockAuth()` — writes a *dummy* token to `localStorage` so `AuthContext` boots straight to Home. The login screen never really authenticates.
- Every `/api/*` call hits the Cloudflare Pages Function `functions/api/[[path]].js`, which **ignores** the client token, logs into the backend with `REVIEW_EMAIL` / `REVIEW_PASSWORD` (CF secrets, currently `duc2820@gmail.com`), and injects *that* Bearer. So **everyone, on every preview URL, sees duc2820's data**.
- `localStorage` is per-origin; every preview deploy is a different subdomain → a session cannot carry across preview URLs.
- MSW mock mode (`web/mocks/*`, `startMocks`) is **inert** in the deployed build (`startMocks` is never called) — the sandbox is real-proxy only.

**Problems:**

- No way to preview as a *different* account.
- No session persistence across preview subdomains.
- No way for the admin panel to show the app *as a specific user* (support / debugging).

## 2. Goals / Non-Goals

**Goals**

- G1. Real login on the sandbox with **any** backend account; drop the forced-account proxy injection.
- G2. Persist the logged-in session in a cookie shared across all `*.auxi-web-review.pages.dev` so any preview link auto-logs-in when it "sees the token".
- G3. Allow the admin panel to embed the sandbox as an iframe that boots as a specific user, via a URL param carrying that user's token — **isolated** (does not pollute the designer session, does not cross between different user-detail iframes).

**Non-Goals**

- Building the backend impersonation token-mint endpoint (cross-repo; see §7).
- Building the admin-SPA user-detail iframe (cross-repo; see §7).
- Any change to native (Metro) auth — all changes are web-only seams.
- Production hardening of the sandbox as a secure environment. It remains a preview/dev surface with pre-prod trust assumptions.
- Per-screen read-only lock-down during impersonation (the embedded app stays fully interactive).

## 3. Feasibility Notes

- **⚠️ Cross-subdomain cookie does NOT work on `*.pages.dev` (verified 2026-07-06, real browser).** This note originally assumed the PSL made `auxi-web-review.pages.dev` the registrable domain so a `Domain=auxi-web-review.pages.dev` cookie would be shared across `*.auxi-web-review.pages.dev`. **Empirically false on Cloudflare Pages:** a Playwright test (with and without `Secure`) set that cookie on preview A (`web-preview-…-sa.auxi-web-review.pages.dev`) and it was **not visible** on preview B — Chromium treats the Pages boundary as a public suffix, so the cookie is stored **host-only** and cannot span preview subdomains. **Consequence:** the "log in on preview A → auto-login on preview B" goal (G2) is not achievable via cookie on `*.pages.dev`. **Decision (accepted, Option A):** ship anyway — the real-login + no-forced-account win and same-origin/prod-URL persistence stand; cross-preview auto-login is a **known limitation**. The cookie mirror code is retained (harmless host-only write; localStorage already handles same-origin persistence) and would start working under a **custom domain** you control (not a public suffix) — see §11.
- **Cross-site iframe cookies are unreliable** — the admin panel is a different top-level site, so the sandbox iframe is third-party. `SameSite=Lax`/`None` cookies get blocked or partitioned by modern browsers. → passing the token via **URL param** is the correct mechanism for the admin iframe; and impersonation must **not** rely on cookies.
- **Storage partitioning naturally isolates the iframe.** In a third-party iframe, `localStorage` is partitioned by the top-level site and cookie writes are blocked. Impersonation therefore can't pollute the first-party designer cookie even without extra guards — but we add an explicit ephemeral-mode guard anyway (§5.1) so isolation does not depend on browser policy.

## 4. Auth lifecycle we build on

All app auth transitions already funnel through `tokenStorage`:

- `loginWithPassword` → `setTokens` (`src/services/auth.ts:182`)
- 401 refresh interceptor → `setTokens` on success / `clearTokens` on failure (`src/services/apiClient.ts:110`, and `onSessionExpired`)
- logout → `clearTokens`
- request interceptor injects `Authorization: Bearer <getAccessToken()>`

So if the **web** `tokenStorage` mirrors to a shared cookie, login/refresh/logout all propagate to the cookie **with zero changes to `auth.ts` / `apiClient.ts`**.

## 5. Design

### Boot precedence (`index.web.tsx`, embed path)

1. **`?token=<jwt>` present → admin impersonation (ephemeral):**
   - `enableEphemeralMode()` (tokenStorage flag — cookie ops become no-ops for this page's lifetime).
   - Seed the token into `localStorage` only (via `setTokens`, which under ephemeral mode skips the cookie mirror).
   - `history.replaceState` to strip `token` from the URL (keep other params like `embed`/screen-intent) so it does not linger in history / on copy.
   - Render `<App/>` → boots authed as that user. Never reads/writes the shared cookie.
2. **No param → cookie auto-login (Feature 1):**
   - `await hydrateFromSharedCookie()` — if `localStorage` has no access token but a valid shared cookie exists, load it into `localStorage`.
   - Render `<App/>` → authed if a token now exists, otherwise the Auth stack (real Welcome / SignIn) mounts.
3. **Share-intent branches preserved:** existing `authState === 'logged-out'` (force auth stack for shared logged-out screens) and `first-login` (force onboarding) behavior in `index.web.tsx` is kept; `?token=` and cookie hydration only apply to the default (non-forced) path.

### 5.1 `src/services/tokenStorage.web.ts` (web-only)

New responsibilities layered on the existing localStorage store:

- **Shared cookie constant:** `AUXI_SESSION`.
- **`sharedCookieDomain()`:** if `location.hostname` ends with `.pages.dev`, return the registrable domain (`auxi-web-review.pages.dev`); otherwise return `undefined` (host-only cookie, e.g. `localhost` dev). Do **not** emit `Domain` for non-pages.dev hosts.
- **`setTokens(input)`:** existing localStorage writes, then (unless ephemeral mode) write cookie:
  - value = URL-encoded JSON bundle `{ access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, user_email }`.
  - attrs: `Path=/; Secure; SameSite=Lax; Domain=<sharedCookieDomain()>; Max-Age=<refresh_token_expires_at − now, fallback 30d>`.
- **`clearTokens()`:** existing localStorage clears, then (unless ephemeral mode) delete the cookie (`Max-Age=0`, same `Domain`/`Path`).
- **`hydrateFromSharedCookie(): Promise<boolean>`:** if no localStorage access token and a shared cookie exists and is not past `access`/`refresh` expiry, parse and write it into localStorage; return whether a session was hydrated. (If the access token is stale but the refresh token is valid, still hydrate — the 401 interceptor will refresh on the first call.)
- **`enableEphemeralMode(): void`:** sets a module-level flag. While set, `setTokens` and `clearTokens` skip **all** cookie operations. Guarantees the impersonation iframe never touches the shared designer cookie, independent of browser third-party policy.

Native `tokenStorage.ts` is unchanged (these are web-file additions only).

### 5.2 `index.web.tsx`

Implement the boot precedence above. Remove the `seedMockAuth()` call from the real path (the dummy-token hack). `web/boot/MockAuthBoot.ts` and MSW may remain for local mock-dev but are not part of the deployed path.

### 5.3 `functions/api/[[path]].js` (Cloudflare Pages Function)

Reduce to a pass-through proxy:

- Remove `getToken`, `REVIEW_EMAIL`/`REVIEW_PASSWORD` usage, the cached-token logic, and the 401-relogin retry.
- Forward the client's `Authorization` header as-is to the backend (works for `/login`, `/auth/refresh`, impersonation, and all data endpoints).
- Keep `headers.delete('host')` and `headers.delete('cookie')` — never leak the sandbox cookie to the backend.
- Forward method / body / query unchanged; return the backend response.
- CF secrets `REVIEW_EMAIL` / `REVIEW_PASSWORD` become unused → remove from the CF project env (cleanup, low-risk).

### 5.4 Analytics

Web Mixpanel is stubbed (`web/stubs/mixpanel.ts`) → no tracking fires on web. Login-screen events are native-only; impersonation auto-boot is not a user action. Update `docs/analytics/mixpanel-tracking-plan.md` §6 with a note that sandbox login now flows through the real screen but web analytics remains stubbed (no new events).

## 6. Data / Token Shapes

- **Cookie `AUXI_SESSION`** (Feature 1): URL-encoded JSON of the full token bundle (access + refresh + expiries + email). ~1–2 KB; sent to CF on every request to the domain — acceptable for a preview surface.
- **`?token=` param** (Feature 2): a single **access-only** user JWT (no refresh token in the URL). Short-lived (~15 min). On expiry the embedded app hits 401 → refresh (no refresh token) → `clearTokens` → session-expired/auth state. The admin panel re-mints and reloads the iframe when needed (admin-side concern).

## 7. Cross-Repo Dependencies (out of this spec's implementation)

Route via tech-lead per the umbrella contract process.

- **wardrobe-backend** — new admin endpoint, e.g. `POST /admin/users/{id}/impersonate`:
  - `Depends(get_current_admin)` → 403 for non-admins; 404 for unknown user.
  - Returns a **short-TTL, access-only** token for the target user (ideally with an `impersonation` claim so the backend can mark/limit/audit it).
  - Should write an **audit log** entry (which admin impersonated which user, when).
  - This endpoint is the real security boundary — the sandbox only trusts the token it receives.
  - Note: existing `routers/admin/v05_test_as_user.py` is **not** this — it is a narrow per-endpoint override (admin JWT + `target_user_id` body) for the V05 recommendation engine only, and does not mint a user session token.
- **wardrobe-admin** SPA — user-detail view embeds:
  `<iframe src="https://auxi-web-review.pages.dev/?embed&token=<minted-token>">` (optionally with a screen-intent param). Re-mints/reloads on token expiry.

## 8. Security Considerations

- **Feature 1:** token is JS-readable in the cookie on the preview domain (accepted trade-off, chosen deliberately over HttpOnly for simplicity + full reuse of the existing auth lifecycle). `Secure` + `SameSite=Lax`. XSS on a preview bundle could read it — acceptable for a non-production surface.
- **Feature 2:** token in the URL can leak via history / `Referer` / logs → mitigated by **access-only + short TTL + strip-from-URL-on-consume**. The impersonation capability is a genuine account backdoor; its authorization is enforced **backend-side** (admin role + audit), not in the sandbox.
- **Isolation:** ephemeral mode + browser storage partitioning keep impersonation from polluting the designer cookie. On the direct-link (non-iframe) path, boot also calls `clearTokens()` (cookie-safe under ephemeral mode) before seeding, so an impersonation link opened in a browser that already holds a designer session can't inherit a stale `refresh_token` and later silently refresh back into the designer account.
- **Known limitation — isolation is per top-level site, not per iframe:** browsers partition `localStorage` by the *top-level* page, not per individual iframe. Two impersonation iframes for *different* users embedded on the *same* admin page (same top-level origin) share one `localStorage` partition and would overwrite each other's access token — last one loaded wins for both (the ephemeral guard protects the shared *cookie*, not `localStorage`). The designed admin flow shows one user-detail (one iframe) at a time, so this is acceptable; if concurrent multi-user impersonation is ever needed, seed the impersonation token into `sessionStorage`/in-memory instead of `localStorage`.
- **Proxy:** now an open pass-through to the production backend — the backend validates all tokens; this is already effectively true today for the proxied login.

## 9. Testing

- **Unit (jsdom):**
  - cookie write → parse round-trip; `Max-Age`/expiry handling; `sharedCookieDomain()` derivation (`x.auxi-web-review.pages.dev` → `auxi-web-review.pages.dev`; `localhost` → host-only).
  - `enableEphemeralMode()` → `setTokens`/`clearTokens` perform **no** cookie writes.
  - `hydrateFromSharedCookie()` → localStorage empty + valid cookie hydrates; expired cookie does not.
  - boot precedence: `?token=` wins over cookie and does not write cookie.
- **Manual on the sandbox:**
  - Feature 1: login on preview A → open preview B URL → lands on Home as the same account; logout on B → A also logged out.
  - Feature 1: hard-expire the access token → first call refreshes and re-mirrors the cookie.
  - Feature 2: open `?embed&token=<user-jwt>` → app runs as that user; the designer's `AUXI_SESSION` cookie is unchanged; a second iframe with a different user's token does not clobber the first.
- `npx tsc --noEmit` clean; `yarn lint` no new errors/warnings; `yarn web:build` succeeds.

## 10. Decisions Locked

- Login model: **real login, any account** (drop forced duc2820).
- Cookie model: **app-managed, JS-readable** (not HttpOnly proxy-managed).
- Param model: **access-only, ephemeral, param-first precedence** (no shared-cookie write).
- Backend token source: **does not exist yet** → build a new admin impersonation endpoint (cross-repo).

## 11. Open Questions

- Exact backend endpoint path / token claim shape (owned by backend-dev via tech-lead).
- Whether to remove `REVIEW_EMAIL`/`REVIEW_PASSWORD` CF env immediately or after a soak. Default: remove during rollout.
- **Cross-preview auto-login (deferred):** to make G2 actually work, serve the sandbox under a **custom domain** you control (e.g. `*.sandbox.<yourdomain>`, which is not a public suffix) so a `Domain=`-scoped cookie can span subdomains. Requires a Cloudflare custom domain + DNS on the `auxi-web-review` Pages project. The existing cookie code would then work with no changes. Until then, cross-preview auto-login is an accepted limitation (see §3).
