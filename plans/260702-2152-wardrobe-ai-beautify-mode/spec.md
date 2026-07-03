# Spec — Wardrobe Upload: "Remove bg + AI Beautify" mode (+ admin gender-classify → OpenAI)

**Date:** 2026-07-02
**Status:** Design approved — ready for implementation planning
**Repos:** `wardrobe-backend` (bulk) + `auxi` (mobile) — cross-repo, no shared SDK; `API_DOCUMENTATION.md` is the contract.
**Approach:** #2 — Decoupled beautify endpoint (beautify is an additive layer; the create/tag pipeline is untouched).

---

## 1. Problem / goal

Today, every wardrobe photo upload is processed one way: `rembg` background removal + `gpt-4o` auto-tagging, run async in a Redis worker. There is **no user choice** in how the image is processed.

We want to add a **second, opt-in upload mode**:

- **Mode A — "Remove background"** *(existing, default)*: `rembg` cutout, free, fast. No change.
- **Mode B — "AI beautify ✨"** *(new)*: generate a **studio product shot** (ghost-mannequin / flat-lay on seamless white) from the user's photo via OpenAI `gpt-image-1`, then let the user **review before/after** and **Accept / Regenerate / Keep original** before it's saved.

Secondary, contained change: **move the admin gender-classify from Gemini → OpenAI**.

## 2. Key context discovered (ground truth, not the stale docs)

- The mobile wardrobe **auto-tag already runs on OpenAI `gpt-4o`** (`services/ai_service.py::_call_openai`), NOT Gemini — despite `# === GEMINI METADATA FIELDS ===` labels and `CLAUDE.md` "🤖 LLM (Gemini) Services". Those labels are **stale**.
- Background removal = **`rembg`** local ONNX (`services/remove_bg_service.py::remove_background`), stored to S3 `processed/{uuid}.png` on `WardrobeItem.image_png`.
- Create/tag pipeline is **async**: `POST /api/wardrobe/items/ai-enhanced` creates the row `is_preparing=true`, enqueues a Redis job, returns instantly; standalone `ai_worker.py` runs `enhance_item_with_ai` (parallel rembg + gpt-4o), then mobile polls (4s) until `is_preparing` flips false → "ready" toast.
- OpenAI image seam **already exists**: `OPENAI_IMAGE_MODEL=gpt-image-1`, quality tiers, timeout config (used by try-on render). Beautify reuses this seam.
- The remaining **live Gemini** usage (out of scope, leave as-is): try-on render + its own garment extraction (`blueprints/tryon/gemini_service.py`), chat agent, decision engine, and the admin gender-classify (`services/fashion_ai_service.py::classify_gender`, only caller `routers/admin/common_items.py:273`). **Only the admin gender-classify moves to OpenAI in this spec.**

## 3. Non-goals (v1)

- ❌ Offering "✨ beautify" on items **already** in the wardrobe (design keeps this cheap to add later — same `POST /items/{id}/beautify` — but it is not wired to a UI in v1).
- ❌ Moving try-on / chat / decision / recommendation off Gemini.
- ❌ Changing the existing tag model or the remove-bg engine.
- ❌ Batch/bulk beautify.

---

## 4. Architecture (Approach 2)

Beautify is a **separate, additive branch**. Every upload still produces a complete item (original + `rembg` cutout + tags). If Mode B is selected, we *additionally* fire a beautify job and route the user to a review screen.

```
MOBILE                          BACKEND (FastAPI)               WORKER (ai_worker.py)
------                          -----------------               ---------------------
1. Pick photo
2. Pick mode  ── Mode B ──▶ consent gate (aiConsent.ts)

3. uploadFile() ───────────▶ POST /api/upload/file ──▶ S3 uploads/…  → url

4. aiEnhance() ────────────▶ POST /items/ai-enhanced
                             (create row, is_preparing=true) ──▶ job: cutout + tag  [UNCHANGED]
                             ◀── item_id                          (rembg + gpt-4o)

   ── item is real: image_url + image_png + tags ──

5. beautify() ─────────────▶ POST /items/{id}/beautify ─────▶ job type "beautify"
   (only if Mode B)          ◀── beautify_job_id                gpt-image-1 studio shot
                                                                → S3 beautified/…
                                                                → image_studio_candidate
                                                                → beautify_status=ready
6. Pending screen (HYBRID): MacgieLoader + rotating copy + ~30–60s
   [Continue browsing] ── user may leave; grid tile shows "✨ beautifying" shimmer
   poll (4s) ──────────────▶ GET /items/{id}/beautify/status
                             ◀── {status, candidate_url}
   status pending→ready ──┬─ if still on pending screen: auto-open review
                          └─ if user left: "✨ Studio shot ready — Review" snackbar → tap → review

7. Review (before/after) + 3 actions:
   • Accept     ─▶ POST /items/{id}/beautify/accept   (image_studio ← candidate; status=accepted)
   • Regenerate ─▶ POST /items/{id}/beautify          (new candidate, overwrites; attempt++)
   • Keep orig  ─▶ POST /items/{id}/beautify/discard  (clear candidate; status=discarded)
```

Why Approach 2: keeps the proven create/tag path intact (lowest risk), models the review loop as explicit endpoint actions (not a fragile state machine inside create), reuses the Redis worker + 4s polling, and is reusable on existing items later.

---

## 5. Data model — `WardrobeItem` (additive; do not alter existing columns)

| Column | State | Meaning |
|---|---|---|
| `image_url` | existing | original user photo — kept as backup |
| `image_png` | existing | `rembg` cutout |
| **`image_studio`** | NEW | accepted studio shot → becomes the display thumbnail |
| **`image_studio_candidate`** | NEW | studio shot awaiting review (uncommitted) |
| **`beautify_status`** | NEW | `none` \| `pending` \| `ready` \| `accepted` \| `discarded` \| `failed` |
| **`beautify_attempts`** | NEW | int, for the regenerate cap |

**Display precedence:** `image_studio` → `image_png` → `image_url`. A `ready` candidate is NOT shown in the grid until accepted (grid keeps showing the cutout), so unreviewed images never leak into the wardrobe.

Migration: additive columns + a DB migration; `to_dict()` (`models/wardrobe.py:156`) exposes the new fields; `MODELS_DOCUMENTATION.md` updated.

---

## 6. Backend components

### 6.1 New service — `services/beautify_service.py`
- `generate_studio_shot(item_id) -> Optional[str]`: fetch `image_url`, call `gpt-image-1` (edit-from-photo + studio prompt), upload to S3 `beautified/{uuid}.png`, write `image_studio_candidate`, set `beautify_status=ready`, `beautify_attempts += 1`. Never raises destructively — on failure sets `beautify_status=failed` and logs loudly (mirror `remove_bg_service` recovery posture).
- Reuse the OpenAI image seam / config (`OPENAI_IMAGE_MODEL`, timeout, quality tier) that try-on uses. New config `BEAUTIFY_MAX_REGENERATIONS` (default 5), `BEAUTIFY_STUDIO_PROMPT`.

### 6.2 Worker — `ai_worker.py`
- Add `job_type == "beautify"` dispatch → `BeautifyService(db).generate_studio_shot(...)` (alongside existing `body_shape_generation`, `tryon_render`). No change to the default cutout+tag job.
- `services/queue_service.py`: add `enqueue_beautify(item_id, user_id)`.

### 6.3 Endpoints — `routers/wardrobe.py`
| Method + path | Behavior | Guards |
|---|---|---|
| `POST /items/{id}/beautify` | enqueue beautify job (also = **Regenerate**); 409 if attempts ≥ cap | auth + ownership |
| `GET  /items/{id}/beautify/status` | `{status, candidate_url?, attempts}` | auth + ownership |
| `POST /items/{id}/beautify/accept` | `image_studio ← candidate`; `status=accepted`; clear candidate | auth + ownership; requires `status=ready` |
| `POST /items/{id}/beautify/discard` | clear candidate; `status=discarded` (keeps cutout) | auth + ownership |

All 4 documented in `API_DOCUMENTATION.md`.

### 6.4 Gender-classify → OpenAI — `services/fashion_ai_service.py`
- Replace the `google-genai` client in `classify_gender(image_url)` with the **OpenAI `gpt-4o` vision** pattern from `ai_service._call_openai` (base64 data-URL, JSON-only, retry/backoff). **Return shape unchanged** (`{M/W/U}`), so `routers/admin/common_items.py` needs no edit. Gemini deps stay (other features use them).

---

## 7. Mobile components (`auxi`)

- **Mode toggle** in `src/screens/wardrobe/AddItemSheet.tsx` — two `AddMethodRow`-style rows (title + description): "Remove background" (default) / "AI beautify ✨". `testID="wardrobe-add-mode-<value>"`.
- **Thread `mode`** through `useAddWardrobeItem.handleImageSelection(type, mode)` → `wardrobeService.uploadWardrobeItem(file, user, typeHint, mode)`. Mode A = current path unchanged. Mode B = after `aiEnhance`, call new `wardrobeService.beautifyItem(itemId)` and navigate to review.
- **Consent gate**: before Mode B runs, `AiConsentDialog` via `useAiConsentGate` (seam exists; try-on uses it). If declined, fall back to Mode A or cancel.
- **Pending + Review screens** — see §7A for the Hybrid waiting UX. Review screen `src/screens/wardrobe/BeautifyReviewScreen.tsx` (register in `navigation.ts` + `AppNavigator.tsx`): before/after, `[Keep original] [Regenerate] [Accept & save]`. `testID="beautify-review-*"`.
- **Service** `src/services/wardrobeService.ts`: `beautifyItem(id)`, `getBeautifyStatus(id)`, `acceptBeautify(id)`, `discardBeautify(id)`. New `WardrobeItem` fields typed.

---

## 7A. Waiting / pending UX (Hybrid — approved) — the long-task friendliness

The studio-shot generation is a **30–60s+ generative task**, so the user must never be trapped behind a dead spinner. The item is already added (cutout + tags) the moment beautify fires, so the studio shot is an **enhancement landing later** — the wait is designed to let the user *watch or leave*.

**A) Pending screen (opt-in to watch)** — `src/screens/wardrobe/BeautifyPendingScreen.tsx` (or a mode of the review screen), shown right after Mode B fires:
- `MacgieLoader` + **rotating status copy** cycled client-side on a timer (gpt-image-1 gives no real progress %): e.g. "Removing background…" → "Setting up studio lighting…" → "Polishing the details…" → "Almost there…". Reduce-motion fallback = one static line.
- A **`~30–60s`** time hint (never a fake progress bar).
- The picked photo shown as a **soft placeholder** behind the loader so there's always something to look at.
- A primary **`[Continue browsing]`** button (`testID="beautify-pending-continue"`) → pops back to Wardrobe; generation keeps running in the background.
- Polls `GET beautify/status` every 4s (reuse `PREPARING_POLL_MS` from `wardrobe-grid.ts`). If the user is **still on this screen** when `status` flips `pending→ready`, auto-transition straight into the before/after review.

**B) Background pending state (if the user left)**:
- The grid **tile** shows a "✨ beautifying" shimmer/pulse badge while `beautify_status === 'pending'` — extend the existing preparing-badge in `WardrobeGridTile.tsx:70`; reuse `MacgieLoader variant="inline"` or a chip. `testID="wardrobe-tile-beautifying-<id>"`.
- Wardrobe list poll extends `anyPreparing` → also polls while `anyBeautifying` (any item `beautify_status==='pending'`), so the shimmer + ready-detection work with the screen focused. (`src/screens/wardrobe/wardrobe-grid.ts`, `WardrobeScreen.tsx:114`.)

**C) Ready notification** — reuse the `ItemReadySnackbar` pattern (`src/components/feedback/ItemReadySnackbar.tsx`): when `beautify_status` transitions `pending→ready`, show **"✨ Studio shot ready — Review"**; tapping opens `BeautifyReviewScreen` for that item. Detection mirrors `useItemReadySnackbar.reconcileReadyItems` (`useItemReadySnackbar.ts:62`).

**D) Failure / timeout state** — if `beautify_status==='failed'` (or a client-side max-wait, e.g. 3 min, elapses): friendly copy "Couldn't beautify this one — your item is saved with its background removed." + `[Keep original]` / `[Try again]`. The item is never lost (it already has the cutout + tags).

**Never-trapped guarantee:** at no point is the user blocked from using the app — the pending screen is dismissible, the item is already usable, and the result comes to them.

---

## 8. Error handling & edge cases

- **gpt-image-1 fail/timeout/refusal** → `beautify_status=failed`; item intact with cutout+tags → nothing lost; review offers Keep original / Try again.
- **User leaves the pending screen** → generation continues in the background; tile shimmers; "ready" snackbar brings them back (§7A). Never blocked.
- **User abandons review** (after ready) → candidate stays `ready` uncommitted; grid shows cutout; a sweep script discards candidates older than N days (reuse `scripts/backfill_*` pattern).
- **Client-side max-wait** (~3 min with no `ready`) → pending screen / tile drops to the friendly failure state (§7A-D); background job may still finish and surface later via the snackbar.
- **Regenerate cap** → soft cap 5/item (`BEAUTIFY_MAX_REGENERATIONS`); button disables past cap.
- **No consent** → Mode B blocked at the toggle.

## 9. Analytics (per `.claude/rules/analytics-tracking-required.md`)

Via `src/services/analytics.ts`, added to `docs/analytics/mixpanel-tracking-plan.md`:
`add_item_mode_selected {mode}` · `beautify_started` · `beautify_wait_continued_browsing` (user tapped Continue browsing) · `beautify_ready` · `beautify_review_opened {from: loader|snackbar}` · `beautify_accepted` · `beautify_regenerated {attempt}` · `beautify_kept_original` · `beautify_failed {reason}` · plus `mode` prop on existing `wardrobe_item_added`. New "beautify funnel": started → ready → review_opened → accepted (segment by `from` to see how many wait vs. leave). No PII; `reason` is a sanitized snake_case code.

## 10. Testing / verification gates

- **Backend:** `python test_server.py` e2e; unit tests for `BeautifyService` (mock gpt-image-1: success/fail/cap), the 4 endpoints (auth + ownership + status guards), and the gender-classify OpenAI swap (asserts `{M/W/U}` shape).
- **Mobile:** `npx tsc --noEmit` + `yarn lint` clean (no new errors over baseline); mode toggle + review screen carry `testID`s; new screen registered in navigation.
- **Smoke:** backend on :5001, real upload in both modes; verify accept/regenerate/keep-original all persist correctly.

## 11. Docs to update

- `wardrobe-backend/API_DOCUMENTATION.md` — 4 new routes + `mode` semantics.
- `wardrobe-backend/MODELS_DOCUMENTATION.md` — new columns.
- `auxi/docs/analytics/mixpanel-tracking-plan.md` — new events + funnel.
- **Stale-label cleanup:** `wardrobe-backend/CLAUDE.md` "🤖 LLM (Gemini) Services", `models/wardrobe.py:60` `# === GEMINI METADATA FIELDS ===`, `services/ai_service.py` docstrings → say OpenAI, so the codebase reflects reality.

## 12. Open items (decide during planning, sensible defaults chosen)

1. **Studio prompt wording** for `gpt-image-1` (ghost-mannequin vs flat-lay; per-category?) — default: single ghost-mannequin-on-white prompt, tune later.
2. **Candidate sweep window** N days — default 7.
3. **`gpt-image-1` quality tier** for beautify (cost vs fidelity) — default: reuse the try-on "final" tier.

---

### Defaults baked in (approved)
Tag on the **original photo** · accepted studio shot = **display thumbnail** (original kept) · **Mode A default**, Mode B opt-in · beautify job enqueued right after item create (runs alongside tag) · beautify **not** offered on existing items in v1.
