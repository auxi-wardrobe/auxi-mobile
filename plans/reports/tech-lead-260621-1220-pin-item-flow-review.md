# Tech-Lead Review — Pin-Item Flow (PR #105, `feat/pin-item-figma-flow`)

Date: 2026-06-21 · Base: `main` · Range: `2a837dc8..c0cfd074`
Reviewer: tech-lead (cross-repo lens) · Sim verify blocked by Xcode 26.5↔RN 0.83.1 (infra) — code-level review only.

## Verdict: APPROVE-WITH-NITS

Zero `critical`. One `major` (analytics doc drift) that is doc-only and trivially fixable.
Two `major`-adjacent items already have documented decisions in-code (the BE-contract
deferral and the slot-0 fallback). No code blocks merge. Two follow-ups must be filed
before this is "done end-to-end".

---

## 1. Contract decision — VALIDATED (FE-robust approach is correct; follow-up issue WARRANTED)

mobile-dev's conclusion "no backend change needed for F1" is **sound for shipping now**,
but the framing undersells real, documented contract drift. The precise state:

**What the backend actually does with `pinned_item_id` (verified):**
- `/recommendation/start` + `/recommendation/next` (the public endpoints `auxi` calls):
  do NOT honour it. The engine input carries `pinned_item_id` but at
  `blueprints/recommendation/engine_v05.py:309` it is **logged only** (telemetry payload),
  never used to filter or compose.
- `/try_another` (V05): DOES honour it — but with **FILTER** semantics, not **MIX/reshuffle-
  around** semantics: `services/v05_try_another_service.py:363-372` drops every pooled outfit
  that doesn't already contain the item; an empty pool falls to fallback.
- `API_DOCUMENTATION.md:3944` documents the `/try_another` field accurately:
  "Keep this item across the variation. Outfits not containing it are filtered out." It is
  silent on `/start` + `/next`, which is also accurate — they don't take it.

**Why the FE-robust splice is the right call:** `buildGridOutfitSheetWithPin`
(`HomeScreen.tsx:333-377`) makes the pinned item lead slot 0 regardless of whether the
batch echoes it back. This is correct because (a) `/start`/`/next` never reshuffle around
it, and (b) even `/try_another`'s filter can return outfits where the item isn't index-0.
The FE is the only layer that can guarantee the Figma "pinned reads first" contract today.
Sending `pinned_item_id` on both paths (`recommendationService.ts:108,139`) is correct
forward-compat — the backend tolerates the unknown field on `/start`/`/next`.

**The latent drift (why a follow-up is warranted, not optional):**
The in-code comment `HomeScreen.tsx:328-332` calls the splice a temporary "MOBILE FALLBACK
until the backend honours `pinned_item_id` and reshuffles around it". That backend behaviour
**does not exist on any endpoint** — not even `/try_another` (filter ≠ mix-around). There is
no tracked issue. If a future backend dev reads only the API doc, they will not know the
mobile app expects mix-around semantics. This is exactly the drift the umbrella exists to
prevent.

→ **Action: file a backend follow-up issue** ("valen recommendation: compose/mix around
`pinned_item_id` on `/start` + `/next` (not just filter on `/try_another`)") and link it
from the `HomeScreen.tsx:331` comment. No backend change blocks THIS PR — the FE splice is
the agreed interim contract. `[major → resolved-by-followup]`

---

## 2. State architecture — SOUND (refs are not gratuitous duplication)

`usePinReducer.ts` is a clean pure reducer; exhaustiveness `never` check is good. The three
refs that mirror state each earn their place:

- `pinnedItemIdRef` (`:653`): read inside `handleToggleItemPin` (`:1612,1623`) and the
  prefetch path (`:1454,1900,1964`) where a fresh state value isn't in scope — standard
  "latest value in a stable callback" pattern.
- `lastPinnedItemRef` (`:663`): caches the resolved `Item` (not just id) so the pinned tile
  survives a reshuffle batch that omits it (F1). The reducer intentionally carries only ids;
  this is the seam that preserves the object. Correct, and correctly nulled on unpin/replace
  (`:1341,1616`) to prevent stale leak.
- `pinDontShowAgainPendingRef` (`:561`): written synchronously in the toggle (`:1721`), read
  at confirm (`:1697`). This is the F2 fix and the right shape — see §5.

No stale-closure risk found in the pin paths: every ref read is the intended "current value"
read, and every ref write is paired with its state setter. The `useReducer` + refs combo is
idiomatic here and does NOT warrant Zustand (correctly avoided per auxi/CLAUDE.md). `[ok]`

Minor: the `useEffect` mirror `pinnedItemIdRef.current = pinnedItemId` (`:784`) and the
ref-vs-state pair are a known RN tax; acceptable. `[minor]`

---

## 3. Slot-0 splice correctness — CORRECT, one cosmetic gap

`buildGridOutfitSheetWithPin` handles all three cases cleanly:
- already index-0 → untouched (`:353`)
- present, not leading → moved to front, rest order preserved, no dup (`:358-367`, filter
  removes the original occurrence) `[ok]`
- absent → `[pinnedItem, ...items.slice(0,3)]` (`:371`) `[ok]`

Edge cases:
- **<4 items batch:** `.slice(0,3)` yields fewer than 3 → grid renders <4 tiles. This is
  fine — `buildGrid` already matches actual count (H2 fix, `:315-321`), and trailing slots
  render transparent. The comment "drop the last item to keep the 4-tile grid" (`:369`) is
  only literally true when batch ≥4; cosmetically misleading for short batches but behaviour
  is correct. `[minor]`
- **pinned item already in batch + also short batch:** the `existingIndex>0` reorder path
  doesn't truncate, so the grid keeps all returned items with the pin leading. Correct. `[ok]`
- **fallback path (outfit=null / lowConfidence):** splice still applies via `optionSets`
  memo (`:1392-1398`); pinned tile stays. `[ok]`

---

## 4. F1 / F2 fixes — both correct

- **F1 (desync):** `pinnedItem` memo (`:1338-1361`) searches all sheets, caches the found
  `Item`, and falls back to `lastPinnedItemRef` only when the id still matches (`:1357`) —
  guards against a stale cache after replace. Solid.
- **F2 (persist):** `handleConfirmPinFromModal` (`:1697-1700`) reads the ref, not the state
  closure, and writes AsyncStorage before dispatch. The toggle mirrors synchronously
  (`:1721`). This is the correct fix for the "write never landed" repro. `[ok]`
  - Nit: the `AsyncStorage.setItem(...).catch(() => {})` swallows write failures silently
    (`:1699`). Acceptable for a UX-pref flag, but a `console.warn` would aid future debugging.
    `[minor]`

---

## 5. FINDINGS BY SEVERITY

### major
- **M1 — Analytics tracking-plan doc drift.** `docs/analytics/mixpanel-tracking-plan.md`
  §5.14 documents an `item_unpinned` source `home_header_label` and a "header `Pinned:
  <label>` clear affordance" — but commit `c0cfd074` REMOVED that header chip; no
  `home_header_label` track call exists in code (only `home_tile_pill`, `home_confirm_sheet`,
  `home_confirm_sheet_replace`). Line numbers in the doc (1583/1655/1575/1641/1668) are also
  stale vs actual sites (1613/1624/1706/1722). The analytics-tracking-required rule makes the
  doc part of "done". **Fix:** drop `home_header_label` from §5.14 and refresh the line refs.
  Doc-only; does not block code merge but must land before sign-off is final.

### minor
- m1 — `HomeScreen.tsx:331` "MOBILE FALLBACK until the backend ... reshuffles around it"
  overstates BE intent (no endpoint mixes around it; `/try_another` only filters). Reword +
  link the new follow-up issue.
- m2 — Stale comment `HomeScreen.tsx:1356` still references the removed "Pinned:" header chip.
- m3 — `buildGridOutfitSheetWithPin:369` "drop the last item to keep the 4-tile grid" is only
  true for batch≥4.
- m4 — `AuthLayout.tsx`: 230+ lines of prettier reindent churn for ONE substantive change
  (`shadowColor:'#000'` → `theme.ds.color.shadow`). The reformat is harmless but bloats the
  diff and pollutes blame. Acceptable since lint/tsc pass; prefer a focused hex-only edit next
  time. Verified whitespace-only apart from the token swap.
- m5 — `PinConfirmModal.tsx` uses a literal `'✓'` checkmark glyph (`:216`) and
  `'rgba(255,255,255,0.3)'` lives in `PinTilePill.tsx:107` (documented as the Figma
  overlay/light/30 token; the token-lint tolerates rgba). Both pre-cleared; noting only.

### informational (NOT a regression — do not block)
- **i1 — `yarn lint` shows 1 error at `HomeScreen.tsx:801`** (`react-hooks/exhaustive-deps`,
  missing `setPinnedItemId`). VERIFIED PRE-EXISTING ON `main` (same block at `main`'s line
  740; setter is stable, rule is overzealous). The auxi/CLAUDE.md baseline ("4 errors all in
  `_HomeScreen.tsx`") is itself stale — `_HomeScreen.tsx` reports 0 now and this HomeScreen
  error predates the PR. NOT introduced here. Recommend PM/mobile-dev refresh the CLAUDE.md
  lint baseline separately.

---

## 6. VERIFICATION GATES
- `npx tsc --noEmit` — GREEN (only legacy `_HomeScreen.tsx` excluded). ✅
- `yarn lint` — 1 error, pre-existing on main (i1), not a regression. Baseline effectively
  preserved. ✅ (with caveat i1)
- i18n parity — `modal_title / modal_subtitle / replace_title / build_cta / dont_show_again /
  tooltip_unpin` present in en-EN, fr-FR, vi-VN. ✅
- Backend `python test_server.py` — N/A (no backend change in this PR). ✅
- testID discipline — pill flips suffix `-set` (`PinTilePill.tsx:50,72`); modal CTAs/
  checkbox/scrim all carry testIDs; a11yLabel ≠ testID per rule. ✅

---

## 7. REQUIRED BEFORE MERGE / SIGN-OFF
1. Fix M1 (analytics doc §5.14 — remove `home_header_label`, refresh line refs). → mobile-dev
2. File backend follow-up issue (compose-around `pinned_item_id` on `/start`+`/next`) and link
   from `HomeScreen.tsx:331`. → tech-lead files; mobile-dev links the comment.

## 8. SUBMODULE / RELEASE NOTE
Mobile-only PR, no backend change. No backend-deploy ordering concern. After merge: bump the
`auxi` submodule pin in the umbrella (devops executes). The compose-around backend work is a
SEPARATE future PR with its own deploy-before-mobile ordering when it lands.

## Unresolved questions
- Q1: Does the CEO want `/start`+`/next` to actually compose-around the pin (real outfit
  including it) vs the current FE-splice-into-an-unrelated-outfit? The splice can show a
  pinned top over a grid the engine didn't build around — visually leads, semantically not
  "built around". Product call. (Drives the backend follow-up's priority.)
- Q2: auxi/CLAUDE.md lint baseline is stale (claims 4 errors in `_HomeScreen.tsx`; actual is
  1 in `HomeScreen.tsx`). Who owns refreshing it?
