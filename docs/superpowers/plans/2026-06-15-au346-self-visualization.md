# AU-346 — Self Visualization Profile (reusable) Implementation Plan

> **For agentic workers:** execution-oriented plan. Backend-first so the mobile
> client builds against a real contract (umbrella rule: no mocked-backend ship).

**Goal:** Turn the one-shot "See this on me" flow into a **reusable visualization
profile** (selfie + optional full-body + body-shape, saved once and reused across
outfits), and move the "Use this photo for future previews" opt-in from the
final preview to the body-shape step — per Linear AU-346.

**Architecture:** Extend the existing `bodies` table into a profile (no new
table — KISS): add `body_shape`, `photo_type`, `full_body_url`, `is_primary`.
Add `GET /api/body/active` + `PATCH /api/body/{id}`. Try-on resolves the active
profile when `body_id` is omitted and threads `body_shape` into the Gemini
prompt. Mobile fetches the active profile on entry: if one exists, skip capture
and offer "View visualization" / "Retake"; else run the existing 3-step capture
and persist the profile (with the opt-in now collected at the shape step).

**Tech Stack:** Backend FastAPI + SQLAlchemy + Alembic + Gemini (service-repo
pattern). Mobile RN + TS + TanStack Query + axios (`apiClient`).

---

## Current state (from research)

- Mobile flow exists: `src/screens/see-this-on-me/*` (selfie -> fullBody? ->
  bodyShape -> generating -> preview), session-only, restarts every visit. Opt-in
  checkbox lives in `OutfitPreview.tsx:47` (local-only, TODO to persist).
- Services: `tryOnService.generateTryOn` -> `POST /api/tryon/highres`
  (`{body_id, wardrobe_item_ids, gemini_opt_in, prompt_params}`);
  `bodyService` -> `POST|GET|DELETE /api/body` (`BodyItem {id,user_id,image_url,created_at}`).
- Backend: `Body` model = `{id,user_id,image_url,created_at}` only. Gemini
  try-on is **sync** (`gemini_service.generate_tryon_sync`), result -> S3
  `tryon/highres/{uuid}.png`, saved to `tryon_images`. No profile concept,
  no body_shape/photo_type/is_primary, no PATCH, no active-profile endpoint.

## API Contract (the deliverable boundary)

### Changed: `Body` model + responses
Add columns (Alembic migration `alter_bodies_add_profile_fields`):
- `body_shape` VARCHAR(20) NULL  -- enum: `pear|hourglass|rectangle`
- `photo_type` VARCHAR(20) NOT NULL DEFAULT `'selfie'` -- `selfie|full_body`
- `full_body_url` VARCHAR(512) NULL -- optional full-body photo on the selfie row
- `is_primary` BOOLEAN NOT NULL DEFAULT false -- the active profile
Body JSON everywhere gains: `body_shape, photo_type, full_body_url, is_primary`.

### New: `GET /api/body/active`
Returns the user's `is_primary` body (the visualization profile) or `{profile: null}`.
`200 -> { profile: BodyJSON | null }`.

### New: `PATCH /api/body/{id}`
Update profile fields without delete/recreate (retake/replace).
Body (json): `{ body_shape?, full_body_url?, is_primary? }`. Replacing the selfie
image reuses `POST /api/body` then `PATCH ... is_primary=true`.
`200 -> { body: BodyJSON }`. 403 if not owner, 404 if missing.

### Changed: `POST /api/body`
Accept optional `body_shape`, `photo_type`, `is_primary` (json or multipart
field). Setting `is_primary=true` unsets the flag on the user's other rows
(single active profile invariant -- enforced in the service).

### Changed: `POST /api/tryon/highres`
- `body_id` becomes optional; if omitted, resolve the caller's `is_primary` body.
- If the resolved body has `body_shape`, inject it into the Gemini prompt
  ("Body shape hint: {shape} -- consider for fit/silhouette").

`API_DOCUMENTATION.md` updated for all of the above (mandatory per umbrella rule).

---

## Phase 1 - Backend (wardrobe-backend, worktree off origin/main)

**Files:** `models/body.py`, `migrations/versions/<rev>_alter_bodies_add_profile_fields.py`,
`routers/body.py`, `blueprints/body/body_service.py` + `body_repository.py`,
`blueprints/tryon/gemini_service.py` (prompt), `routers/tryon.py` (resolve active),
`API_DOCUMENTATION.md`, tests under `tests/`.

Tasks:
1. Migration + model columns (`body_shape`, `photo_type`, `full_body_url`, `is_primary`).
2. Repository: `get_primary(user_id)`, `set_primary(user_id, body_id)` (unset others
   in one tx), `update_fields(body_id, **fields)`.
3. Service: enforce single-active invariant; ownership checks; body-shape enum validation.
4. Router: `GET /api/body/active`, `PATCH /api/body/{id}`; extend `POST /api/body`
   to accept the new fields; serialize new fields in all body responses.
5. Try-on: make `body_id` optional -> resolve `get_primary`; thread `body_shape`
   into `prompt_params`; gemini prompt builder adds the shape hint.
6. `API_DOCUMENTATION.md` section updates.
7. pytest: model/migration smoke, repository single-active invariant, router
   active/patch/owner-403, try-on active-profile resolution (Gemini mocked).

Gate: `pytest` green; `python test_server.py` if feasible.

## Phase 2 - Mobile (auxi, worktree off origin/main)

**Files:** `src/services/bodyService.ts` (add `getActiveProfile`, `updateBody`;
extend `BodyItem` + `uploadBody` to send `body_shape`/`photo_type`/`is_primary`),
`src/screens/see-this-on-me/SeeThisOnMeScreen.tsx` (profile-aware entry + retake),
`StepBodyShape.tsx`/`BodyShapeCarousel.tsx` (move opt-in checkbox here),
`OutfitPreview.tsx` (remove opt-in; add View/Download/Retake per returning flow),
a new `OutfitVisualizationSheet.tsx` (returning-user bottom sheet),
translations `src/translations/*` (move `seeThisOnMe.optIn` to shape step + new keys),
tests under `__tests__`.

Tasks:
1. `bodyService`: `getActiveProfile(): Promise<BodyProfile | null>` (`GET /api/body/active`),
   `updateBody(id, {body_shape?, full_body_url?, is_primary?})` (`PATCH`); extend
   `uploadBody` to pass new fields; extend `BodyItem`->`BodyProfile` type.
2. Entry gating: on screen mount, `useQuery(['body','active'])`. If a profile
   exists -> show "View visualization" + "Retake" (skip capture); else run capture.
3. Move the opt-in checkbox to the body-shape step (default checked); thread its
   value into the persist call (`is_primary` / save profile) instead of preview.
4. On successful generate with opt-in: persist profile (`is_primary=true`, set
   `body_shape`, link `full_body_url`).
5. Returning-user `OutfitVisualizationSheet` (View/Download/Retake) + states
   (loading/ready/failed) per spec.
6. Retake -> PATCH/replace, existing profile stays until replacement succeeds.
7. testIDs preserved + new ones; i18n keys moved/added.
8. Gates: `tsc` 0, `jest`, `eslint` 0.

## Test strategy
- Backend: pytest unit (repo invariant, service validation, router auth/owner) +
  try-on resolution with Gemini mocked. Don't call real Gemini/S3.
- Mobile: jest for `bodyService` (request shapes) + a pure helper for entry-state
  selection (profile? -> which UI). Component smoke where tractable.

## Risks / decisions
- **Single table vs new table:** extend `bodies` (KISS) -- a user has one active
  profile; history rows remain.
- **Figma fidelity:** implement to the spec's described UX; pixel-level Figma
  compare is a qa-ui follow-up (no extraction artifact for this revision yet).
- **Gemini/S3 not verifiable locally:** unit-test with mocks; flag integration
  verification (real key + DB) as a QA gate before merge.
- **full-body linking:** stored as `full_body_url` on the selfie row (no second
  body row) to keep "one profile = one row".
