# Universal Links / App Links — Cloudflare setup for macgie.com

> ✅ **Done (2026-08-28).** Both files are live on production `macgie.com` via
> the `homepage/` repo (`macgie-homepage` Cloudflare Pages project) —
> `public/.well-known/{apple-app-site-association,assetlinks.json}` +
> `public/_headers` content-type rules. `www.macgie.com` currently 404s on
> these paths even though it serves the site's other pages — not diagnosed
> further (non-blocking; the iOS entitlement also declares `macgie.com`
> apex, which works). Android's `assetlinks.json` still has the placeholder
> fingerprint — Step 4 below is still a real TODO.

> For whoever has Cloudflare access to `macgie.com`. Two static files need to
> go live at fixed paths. Nothing else on the existing site changes.

## What this does

Right now `auxi://discovery-outfit?id=...` only opens the app if the app is
already installed AND the link is tapped from somewhere that respects custom
URL schemes (Notes, Messages, a raw link). It does **not** work when tapped
from inside Instagram/Facebook's in-app browser, or shared as a plain
`https://` link — those require a real **Universal Link** (iOS) / **App
Link** (Android), which needs these two files hosted on the domain.

## Step 1 — Create a new, standalone Worker (doesn't touch the existing site)

You don't need to know what currently serves macgie.com. A Cloudflare
**Worker Route** can be scoped to just the `/.well-known/*` path — every
other URL on the domain keeps going wherever it already goes, untouched.

1. Log into **dash.cloudflare.com** with the account that manages the
   `macgie.com` domain (its nameservers already point at Cloudflare, so this
   account exists — ask whoever registered/deployed the domain if unsure
   which login).
2. Left sidebar → **Workers & Pages** → **Create** → **Create Worker** (not
   "Pages" — pick the plain Worker option).
3. Give it any name, e.g. `macgie-well-known` → **Deploy** (it deploys a
   placeholder "Hello World" first — that's fine, you'll replace it next).
4. Open the Worker → **Edit code** (top right, sometimes labelled
   "Edit Code" or via the `</>` icon).
5. Delete everything in the editor and paste the full contents of
   [`well-known-worker.js`](./well-known-worker.js) (this directory) in its
   place.
6. **Deploy** / **Save and deploy**.

## Step 2 — Point ONLY `/.well-known/*` at this new Worker

1. Still on the Worker's page → **Settings** tab → **Triggers** → **Routes**
   → **Add route**.
2. Route: `macgie.com/.well-known/*` — Zone: `macgie.com`. Save.
3. Add a second route the same way: `www.macgie.com/.well-known/*`.

That's it — nothing else on macgie.com changes. Only requests to
`/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`
get answered by this Worker; every other path (`/`, `/anything-else`) keeps
being served by whatever already serves it today.

## Step 3 — Verify

After deploying:

```bash
curl -sI https://macgie.com/.well-known/apple-app-site-association
# expect: HTTP/2 200, content-type: application/json, no redirect

curl -s https://macgie.com/.well-known/apple-app-site-association | python3 -m json.tool
# expect: valid JSON matching this dir's copy

curl -sI https://macgie.com/.well-known/assetlinks.json
curl -s https://macgie.com/.well-known/assetlinks.json | python3 -m json.tool
```

Also check `https://www.macgie.com/.well-known/...` if `www` is a separate
route — both `macgie.com` and `www.macgie.com` are declared in the app's
Associated Domains entitlement.

## Step 4 — Android: get the real signing certificate fingerprint

`assetlinks.json` in this directory has a placeholder —
`REPLACE_ME__SEE_cloudflare-setup.md_STEP_4`. It MUST be the SHA-256
fingerprint of the certificate that actually signs the app users install,
not the local debug keystore (this repo's `android/app/build.gradle`
currently signs even the `release` build type with `debug.keystore` — that
is almost certainly not what's used for real distribution; check with
whoever manages the Play Console release).

- **If using Play App Signing** (standard for Play Store releases): Play
  Console → your app → Setup → App integrity → App signing key certificate
  → copy the `SHA-256 certificate fingerprint`.
  Reference: https://developer.android.com/training/app-links/verify-android-applinks#web-assoc
- **If self-signing a release keystore**: `keytool -list -v -keystore
  <path-to-release-keystore> -alias <key-alias>` and copy the `SHA256:`
  fingerprint (strip the colons or keep them — Google accepts both colon-
  and non-colon formats; the standard format in `assetlinks.json` keeps the
  colons, e.g. `"14:6D:E9:83:C5:73:...")`.

Multiple fingerprints are allowed in the array (e.g. one for Play App
Signing, one for a local upload key) — add all that apply.

Until this is filled in with a real value, Android App Links will simply
fail verification and links keep opening in the browser instead of the
app — no crash, no user-visible error, just no auto-open. iOS Universal
Links (Step 2/3 above) work independently of this and don't need it.

## What's on the app side (already done, ships in the next build)

- `auxi/src/services/deepLinkHandler.ts` — now accepts
  `https://macgie.com/...` and `https://www.macgie.com/...` (was
  `auxi.app`, a stale pre-rebrand host with no real DNS behind it).
- iOS: `com.apple.developer.associated-domains` entitlement added
  (`applinks:macgie.com`, `applinks:www.macgie.com`).
- Android: an `autoVerify="true"` HTTPS intent-filter added for the same
  paths, alongside the existing custom-scheme filter.

None of this takes effect until the app is **rebuilt** (a new
TestFlight/Play build, or a fresh local native build with the updated
entitlements/manifest) — a JS-only Fast Refresh does not pick up entitlement
or manifest changes.
