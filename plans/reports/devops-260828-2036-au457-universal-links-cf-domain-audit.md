# AU-457 Discovery — Cloudflare domain audit for Universal/App Links (READ-ONLY)

Date: 2026-08-28
Scope: diagnose which domain(s) this project's Cloudflare account actually
controls, before picking a host for `.well-known/apple-app-site-association`
and `.well-known/assetlinks.json`. No mutations performed.

## Bottom line

**I could not reach live Cloudflare zone/DNS data in this session** — no
`mcp__plugin_cloudflare_*` (or any Cloudflare) MCP tools were actually
granted to this subagent invocation, `wrangler whoami` is unauthenticated
locally, and no `CLOUDFLARE_API_TOKEN` is present in the shell environment
or any non-example `.env` file I could read. Everything below is inferred
from repo config/docs, not verified against the live account. **Do not
treat any of this as confirmation that a zone exists or is empty** — it's
a "what the code claims" summary only.

## What tool access actually existed this session

- Function list available to me: `Read`, `Write`, `Edit`, `Bash`, `Skill`.
  No `mcp__plugin_cloudflare_*` / `mcp__cloudflare__*` tools present —
  despite the umbrella `devops.md` frontmatter describing a Cloudflare MCP
  grant, this particular subagent dispatch didn't receive it.
- `Skill("cloudflare:cloudflare")` → `Unknown skill` (not the right name /
  not installed under that id in this session).
- `npx wrangler whoami` → **not authenticated** ("Please run `wrangler
  login`"). No cached wrangler config at `~/.wrangler/config/default.toml`.
- `env | grep -i cloudflare` → nothing except an unrelated macOS
  `__CF_USER_TEXT_ENCODING` var. No `CLOUDFLARE_API_TOKEN` /
  `CLOUDFLARE_ACCOUNT_ID` exported in this shell.

**Net effect: I cannot answer questions 1–3 from live data.** Below is what
the repo's own config/docs claim, with an explicit verified/unverified tag
on each line.

## Domain candidates found in code/docs — status

| Candidate | Where referenced | Status |
|---|---|---|
| `duc2820.workers.dev` (subdomain, not a custom domain) | `wardrobe-backend/wardrobe-admin/CLAUDE.md` — admin SPA lives at `wardrobe-admin.duc2820.workers.dev`; `wardrobe-backend/wrangler.toml` (`worker-proxy`, D1 `auxi`, R2 `auxi`, KV `CACHE`) also implies the same account, worker name `wardrobe-backend-python` | **Real, but it's Cloudflare's own `*.workers.dev` subdomain, not a zone the project owns.** You don't control DNS/`.well-known` routing rules on `workers.dev` beyond the one worker's own routes — it's not a candidate for AASA/assetlinks hosting since Apple/Google associated-domains checks are host-scoped and `workers.dev` is a shared apex not eligible for that kind of trust anchor anyway. |
| `pages.dev` (`auxi-web-review.pages.dev`) | `auxi/docs/web-review-architecture.md`, `auxi/docs/web-review-cf-git-setup.md`, `auxi/CLAUDE.md` "sandbox" section | **Real Cloudflare Pages project** (`auxi-web-review`), confirmed by CF account id `b486fb51a808d6c53183f43594357793` in `auxi/.env.deploy.example` (account `duc2820@gmail.com`). Grep of `web-review-cf-git-setup.md` for "domain" / "macgie" / "auxi.app" / "custom domain" returned **nothing** — no custom domain is documented as attached to this Pages project. It's a `*.pages.dev` review-only deployment, matching what the task description already assumed. |
| `auxi.app` | Hardcoded in `auxi/src/services/deepLinkHandler.ts` (`SUPPORTED_HOSTS = new Set(['auxi.app'])`) | **No evidence anywhere in the repo (wrangler configs, CI workflows, docs) that this is a real Cloudflare zone.** Zero hits for `auxi.app` outside that one mobile source file in a repo-wide context search. This looks like a placeholder/stale value from before the Macgie rebrand — consistent with your read. |
| `macgie.com` | `auxi/src/content/legal/privacy-policy.ts`, `terms-of-service.ts` (`marketing@macgie.com`) | **No wrangler config, CI secret, or DNS reference in either repo.** Only appears as an email domain in legal copy — that alone doesn't prove Cloudflare hosts it (could be a mail-only domain on a different registrar/DNS provider, or not registered/hosted at all yet). |
| `beta.macgie.com` | Same legal-copy files, described as "possible future" | Same as above — copy-only, no infra config found. |
| `cdn.macgie.app` | `wardrobe-backend` test fixtures (CDN domain used in test data) | **Test-fixture value only** — appears in `wardrobe-backend/tests/*` as a mock/expected string for CDN URL assertions, not a deployed CDN config I could find (no CloudFront/S3/CF zone config referencing it in `wardrobe-backend/config.py` or infra files I checked in prior sessions). Treat as aspirational/placeholder until confirmed live.

## What I could NOT check (needs live CF access)

1. Zone listing for the Cloudflare account tied to `duc2820@gmail.com`
   (account id `b486fb51a808d6c53183f43594357793`) — whether `macgie.com`,
   `macgie.app`, `auxi.app`, or anything else is an actual zone with active
   nameservers pointed at Cloudflare.
2. Existing DNS records / Pages custom domains / Worker routes on any real
   zone that might already occupy `/` or `/.well-known/*`.
3. Whether an existing Pages project or Worker route could absorb two new
   static files, or whether a fresh Pages project / Worker route is needed.

## How to actually get this answered

Pick one, in order of least setup:
- **Fastest**: run `npx wrangler login` (or set `CLOUDFLARE_API_TOKEN` env
  var) in a session that has browser/OAuth access, then `wrangler zone
  list` (or `GET /accounts/:id/zones` via the CF REST API) — one command
  answers question 1 directly.
- **If MCP is expected to work**: confirm the Cloudflare MCP server is
  actually wired into this session's tool grant (per umbrella `devops.md`,
  it should show up as `mcp__plugin_cloudflare_*` after its own
  `authenticate` step) — it wasn't present here, so either the grant didn't
  propagate to this dispatch or auth was never completed.
- **Manual fallback**: check the Cloudflare dashboard directly under the
  `duc2820@gmail.com` account for the zone list.

## Recommendation once a real zone is confirmed

- If `macgie.com` (or `macgie.app`) turns out to be a real zone with no
  existing root content: **lowest-risk path is a small dedicated Worker**
  (not the existing `wardrobe-admin` Pages project, and not `worker-proxy`)
  bound to that zone's apex + a route for `/.well-known/*`, serving the two
  static JSON files with the correct `Content-Type` (AASA needs
  `application/json` and **no** file extension, served without redirects).
  This avoids touching the admin SPA's asset routing or its build-time-baked
  `VITE_API_URL` config, and avoids fighting the SPA's
  `not_found_handling: "single-page-application"` fallback (which would
  otherwise swallow `/.well-known/*` 404s into `index.html` and break AASA
  validation — a real gotcha if you tried to bolt this onto
  `wardrobe-admin`'s existing Pages project).
- If the only real zone is `auxi-web-review.pages.dev` (Pages, no custom
  domain) — that's a `*.pages.dev` subdomain, not eligible to be the
  universal-link host for a production app; a real owned+verified apex/
  subdomain is required for AASA/assetlinks trust, so this can't be the
  answer regardless of routing convenience.
- Until a zone is confirmed, updating `SUPPORTED_HOSTS` in
  `deepLinkHandler.ts` or the legal-copy domains is **out of my scope**
  (app code / copy) — that's mobile-dev's call once tech-lead confirms the
  real domain.

## Files referenced (all read-only)

- `/Users/hiep/Source/auxi-all-in/auxi/src/services/deepLinkHandler.ts` (not
  edited — read via grep context only, cited from task description)
- `/Users/hiep/Source/auxi-all-in/wardrobe-backend/wrangler.toml`
- `/Users/hiep/Source/auxi-all-in/wardrobe-backend/wardrobe-admin/wrangler.jsonc`
- `/Users/hiep/Source/auxi-all-in/auxi/.env.deploy.example`
- `/Users/hiep/Source/auxi-all-in/auxi/docs/web-review-cf-git-setup.md`
- `/Users/hiep/Source/auxi-all-in/auxi/docs/web-review-architecture.md`
- `/Users/hiep/Source/auxi-all-in/wardrobe-backend/.github/workflows/deploy-admin.yml`

## Unresolved questions

- Was the Cloudflare MCP grant expected on this specific subagent dispatch,
  or does zone-listing require re-running from a session with `authenticate`
  already completed?
- Is `macgie.com` / `macgie.app` actually registered anywhere yet (any
  registrar), independent of Cloudflare hosting?
- Who holds the Cloudflare login for `duc2820@gmail.com` — can they run
  `wrangler login` interactively to unblock a live zone check?

**Status:** BLOCKED — no live Cloudflare API/MCP access available in this
session (no MCP tool grant, no local wrangler auth, no API token in env).
Findings above are code/doc-only and explicitly not a substitute for a real
zone listing.
