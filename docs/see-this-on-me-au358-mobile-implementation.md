# See This On Me (AU-358) — Mobile Implementation Guide

> **Audience:** `mobile-dev`. This doc explains how to migrate the existing
> "See This On Me" flow from the **static-shape + synchronous-render** version to
> the new **AU-358 backend**: 3 **AI-generated** body-shape photos (generate →
> poll → select) and an **async** outfit render (submit → poll). Backend is done
> and live; this is the mobile side.
>
> Backend spec: `wardrobe-backend/docs/superpowers/specs/2026-06-30-au358-self-visualization-3shape-design.md`. Backend PR: auxi-backend #120.

---

## 0. TL;DR — what changes vs today

| Area | Today (shipped) | AU-358 (this doc) |
|---|---|---|
| Body-shape step | 3 **static text tiles** `pear/hourglass/rectangle` (`body-shapes.ts`) | 3 **AI-generated photos** `slim/average/fuller` the user picks from |
| How shapes appear | instant, hardcoded | **async**: `POST body-shape/generate` → poll `result` → 3 image URLs (~30–90s) |
| Persisting the pick | `PATCH /api/body/{id}` (mark primary + body_shape) | `POST body-shape/select` (server creates the primary profile + returns it) |
| Outfit render | `POST /tryon/highres` returns `composite_url` **synchronously** | `POST /tryon/highres` returns **`{job_id}`** → poll `GET /tryon/result/{job_id}` |
| Vocabulary | `BodyShape = pear\|hourglass\|rectangle` | `BodyShape = slim\|average\|fuller` |

Unchanged: photo upload (`POST /api/body`), reuse-profile (`GET /api/body/active` + `decideEntryMode`), and the out-of-React background/notify machinery (`try-on-generation-store.ts` + `use-try-on-generation.ts` + `try-on-completion-notice.ts`) — **reuse it for both async steps**.

---

## 1. New end-to-end flow

```
StepSelfie (POST /api/body, photo_type=selfie)        → selfie_id
StepFullBody (POST /api/body, photo_type=full_body)   → full_body_id
        │
        ▼  NEW async step
POST /api/body-shape/generate {full_body_id, selfie_id, gemini_opt_in:true} → {job_id}
   ↳ poll GET /api/body-shape/result/{job_id}  (every ~2s, ~30–90s)
        → { status:"completed", shapes:[{shape:"slim",image_url}, "average", "fuller"], partial }
        │
        ▼  carousel shows the 3 REAL images (not labels)
user picks → POST /api/body-shape/select {job_id, shape} → BodyProfile (primary; id + image_url)
        │
        ▼  render the outfit on the chosen body
POST /api/tryon/highres {body_id:<profile.id>, wardrobe_item_ids, gemini_opt_in:true} → {job_id}
   ↳ poll GET /api/tryon/result/{job_id}  (every ~2s, ~30–60s)
        → { status:"completed", composite_url }
        │
        ▼
OutfitPreview (composite_url)
```

**Reuse path (AU-346, unchanged trigger):** on entry, `GET /api/body/active`. If a primary profile with a `body_shape` exists and the user doesn't "Retake" → **skip generate/poll/select entirely**, go straight to the render step with `body_id = profile.id`.

---

## 2. Backend API contract (all live on auxi-backend)

All routes require `Authorization: Bearer <token>`. `gemini_opt_in` is the AI-consent flag — must be `true` (else 400).

### 2.1 (unchanged) Upload a body photo
`POST /api/body` — multipart `file` (+ optional `photo_type`: `selfie` | `full_body`). → `{ message, body: BodyItem }` (`body.id`, `body.image_url`). 422 → `BodyPhotoNotPersonError` (existing handling stays).

### 2.2 NEW — generate 3 body-shape photos
`POST /api/body-shape/generate`
```jsonc
// request
{ "full_body_id": "body_…", "selfie_id": "body_…", "gemini_opt_in": true }
// 202
{ "job_id": "bodyshape_<uuid>", "status": "pending" }
```

### 2.3 NEW — poll the 3-shape result
`GET /api/body-shape/result/{job_id}`
```jsonc
{ "job_id": "bodyshape_…",
  "status": "pending|processing|completed|failed",
  "shapes": [ { "shape": "slim",    "image_url": "https://…" },
              { "shape": "average", "image_url": "https://…" },
              { "shape": "fuller",  "image_url": "https://…" } ],
  "partial": false,   // true = only 1–2/3 succeeded → show what's there + a "regenerate" affordance
  "error": null }
```
Poll every ~2s until `completed`/`failed`. `shapes` may grow incrementally on `processing` (you can show them as they arrive).

### 2.4 NEW — select a shape → reusable primary profile
`POST /api/body-shape/select`
```jsonc
// request
{ "job_id": "bodyshape_…", "shape": "average" }
// response = the new primary Body profile (use its id as body_id for the render)
{ "id": "body_…", "image_url": "<chosen render>", "body_shape": "average",
  "is_primary": true, "full_body_url": "…", "photo_type": "full_body" }
```
This **replaces** the old `PATCH /api/body/{id}` "mark primary + body_shape" step for setting the shape — `select` creates/flips the primary profile server-side and returns it.

### 2.5 CHANGED (breaking) — outfit render is now async
`POST /api/tryon/highres` — same request body (`body_id`, `wardrobe_item_ids` 1–4, `gemini_opt_in`, `prompt_params?`). **Now returns a job, not the image:**
```jsonc
// 202
{ "job_id": "tryon_<uuid>", "status": "pending" }
```
`GET /api/tryon/result/{job_id}` → poll:
```jsonc
{ "job_id": "tryon_…", "status": "pending|processing|completed|failed",
  "composite_url": "https://…",   // present on completed; this is OUR durable S3 URL
  "error": null }
```
> Server picks the render provider (Kling Image 3.0 → OpenAI fallback) — **transparent to mobile**; you just poll for `composite_url`.

### 2.6 (unchanged) Reuse profile
`GET /api/body/active` → `{ profile: BodyProfile | null }` (the primary `Body`). Drives `decideEntryMode`.

---

## 3. Mobile changes — file by file

### 3.1 `src/services/bodyService.ts`
- Change the vocabulary: `export type BodyShape = 'slim' | 'average' | 'fuller';` (was pear/hourglass/rectangle). `BodyItem.body_shape`/`BodyProfile` follow automatically.
- Keep `uploadBody`, `getActiveProfile`. You no longer need `updateBody` for setting the shape (the new `select` endpoint does it) — keep `updateBody` only if used elsewhere.

### 3.2 NEW `src/services/bodyShapeService.ts`
Three calls + a small poller:
```ts
generateBodyShapes(payload: { full_body_id: string; selfie_id: string; gemini_opt_in: true }): Promise<{ job_id: string }>
getBodyShapeResult(jobId: string): Promise<{ status; shapes?: {shape:BodyShape;image_url:string}[]; partial?: boolean; error?: string }>
selectBodyShape(payload: { job_id: string; shape: BodyShape }): Promise<BodyProfile>
```
All via `apiClient` (inherits the bearer + 401-refresh interceptor, like `tryOnService`).

### 3.3 `src/screens/see-this-on-me/body-shapes.ts`
- Replace the static `BODY_SHAPE_OPTIONS` (pear/hourglass/rectangle) with the **dynamic** shapes returned by `getBodyShapeResult` — the carousel now renders **image_url**s, not labels. Keep an ordered list `['slim','average','fuller']` for stable display order + i18n labels.
- i18n: rename keys → `seeThisOnMe.shapes.slim` / `.average` / `.fuller` (update locale files).

### 3.4 `src/screens/see-this-on-me/StepBodyShape.tsx` + `BodyShapeCarousel.tsx`
- Render the 3 **generated photos** (`<Image source={{uri: shape.image_url}}/>`) in the existing carousel/tiles instead of labeled cards. Keep pagination dots, Retake/Use actions, opt-in checkbox.
- "Use this photo" → `onSelectShape(shape.shape)` (unchanged callback name) → screen calls `selectBodyShape({job_id, shape})`.

### 3.5 `src/screens/see-this-on-me/SeeThisOnMeScreen.tsx` (state machine)
- Add a **new step `generatingShapes`** between `fullBody` and `bodyShape`:
  - On leaving `fullBody` (skip or uploaded), call `generateBodyShapes({full_body_id, selfie_id, gemini_opt_in:true})`, store `job_id`, set `step='generatingShapes'`, and start polling `getBodyShapeResult` (reuse the background store pattern — see §4).
  - On `completed` → store `shapes`, `setStep('bodyShape')`. On `partial` → still go to `bodyShape` with available shapes + a "regenerate" hint. On `failed` → error state with retry.
- `onSelectShape(shape)`:
  - `const profile = await selectBodyShape({ job_id, shape })`
  - `runGenerate(profile.id, shape)` — note: `body_id` is now the **selected profile's id** (the chosen AI body image), not the raw selfie/full-body id.
- Reuse path (`reuseMode`): unchanged — skip generate/select, call `runGenerate(activeProfile.id, activeProfile.body_shape)`.

### 3.6 `src/services/tryOnService.ts` + `try-on-generation-store.ts` (async render)
This is the key behavioral change — the render is **no longer synchronous**.
- `tryOnService.generateTryOn(payload)` now resolves to `{ job_id }` (not `composite_url`). Add `tryOnService.getTryOnResult(jobId)` → `{status, composite_url, error}`.
- In `try-on-generation-store.ts` `start()`: replace the single `await generateTryOn()` (which expected `composite_url`/`composite_png`) with **submit → poll**:
  1. `const {job_id} = await generateTryOn(payload)`
  2. poll `getTryOnResult(job_id)` every ~2s until `completed` (→ `resultUrl = composite_url`) or `failed` (→ `status:'error'`), with a ~120s ceiling.
  3. Keep the existing `runToken` orphaning, `backgrounded` handling, and `onBackgroundComplete` callback exactly as-is — only the "how we get the URL" changes.
- The `useTryOnGeneration()` hook + `OutfitPreview`/`GeneratingView` consume `resultUrl` unchanged.

### 3.7 Reuse the background/notify machinery for BOTH async steps
`try-on-generation-store.ts` already keeps a render alive when the user leaves + fires a completion Toast (PR #87). Apply the **same pattern** to the 3-shape generation so the user can leave during the ~30–90s generate and get notified when the shapes are ready (or just reuse one store with a `phase: 'shapes' | 'render'` field). Don't build a second mechanism.

---

## 4. Polling + timeouts (guidance)
- Interval: ~2s for both `body-shape/result` and `tryon/result`.
- Ceilings: 3-shape gen up to ~120s (OpenAI is slower); render up to ~120s. Keep the existing `TRY_ON_TIMEOUT_MS` spirit.
- Both steps: keep the request/poll **outside React** (the store) so navigating away doesn't drop it; surface completion via the existing Toast.

## 5. Analytics (per `.claude/rules/analytics-tracking-required.md`)
Keep existing events. Add:
- `body_shape_generation_started` `{ outfit_hash }` — on `generate` submit.
- `body_shape_generation_completed` `{ outfit_hash, partial }` / `body_shape_generation_failed` `{ outfit_hash }` — on poll resolve.
- `body_shape_selected` `{ shape }` — on `select`.
Existing `try_on_started/completed/failed`, `body_shape_generation_backgrounded`, `_completed_notified`, step events, reuse events — keep.

## 6. Breaking changes to call out in the PR
1. **`/tryon/highres` is async** — anything reading `composite_url` from the POST response breaks; must poll `tryon/result`.
2. **Body-shape vocabulary** `pear/hourglass/rectangle` → `slim/average/fuller` (types + i18n + any persisted values).
3. The body-shape step is now an **async generation**, not instant — add the `generatingShapes` loading state.

## 7. Testing checklist
- [ ] Full capture path: selfie + full-body → 3 AI shapes render in carousel → select → outfit render → preview.
- [ ] Reuse path: returning user with a primary profile skips generate/select → renders directly.
- [ ] Leave during 3-shape gen AND during render → Toast fires on completion; tapping returns to the result.
- [ ] `partial` (1–2/3 shapes) handled. `failed` → retry.
- [ ] 422 on upload still surfaces `BodyPhotoNotPersonError`.
- [ ] No raw garment-fidelity expectation set in copy (default render is Kling Image 3.0 image-to-image / OpenAI — coherent dressed person, not pixel-exact garment; see backend spec §8 deferred scene work).
- [ ] `npx tsc --noEmit` + `yarn lint` clean; analytics doc (`docs/analytics/mixpanel-tracking-plan.md`) updated.
