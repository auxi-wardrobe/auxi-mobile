# AI Daily-Limit Gate — Design Spec

**Date:** 2026-07-13
**Branch:** `feat/ai-limit-gate` (off `origin/main` @ `b02d5c5f8`)
**Status:** Approved (CEO) — ready for implementation

## Problem

When a user exhausts the per-user daily AI budget, the backend returns
`429 { detail: { code: "ai_daily_limit_reached" } }` on the expensive AI
endpoints (try-on render, body-shape gen, recommendation build). The
**recommendation/Home flow already handles this** (`HomeErrorState.tsx` →
`ai_limit` variant, dedicated copy, no retry). The **try-on / Self-visualization
flow does NOT** — it collapses every failure into a generic "We couldn't create
your look. Please try again." with a **Try again** button that re-hits the limit
and inflates the counter (the retry-storm amplifier confirmed in prod
2026-07-13, user hit 76/50).

## Goal

A **reusable, reactive** limit-reached gate that, on the `ai_daily_limit_reached`
429, shows a proper "you're out for today, come back tomorrow" notification with
**no retry action** — killing the retry storm at the UI. Wired into try-on now;
built feature-agnostic so recommendation/Home can adopt it later.

## Non-goals / scope decisions (approved)

- **Reactive only** — fires on the 429; NO proactive pre-check, NO new backend
  endpoint (backend limit work is owned separately).
- **Try-on only now** — Home keeps its existing inline `ai_limit` handling; do
  NOT refactor Home (YAGNI). The new component/hook are reusable so reco can
  adopt later.
- Covers **both** try-on phases (render + body-shapes) — both can 429.
- Feature-neutral copy (one sheet serves all AI features).

## Design

Mirrors the existing `useAiConsentGate` / `AiConsentDialog` pair (DRY — same
gate shape the codebase already uses for AI consent).

### 1. `src/components/features/AiLimitSheet.tsx` (new, presentational)

Bottom-sheet built on the design-system `MBottomSheet` primitive
(`src/components/design-system/lib/MBottomSheet.tsx`) so motion + tokens are
on-system. Renders: an icon, title, body, and ONE primary **"Got it"** button.
**No retry button.**

Props:
```ts
interface AiLimitSheetProps {
  visible: boolean;
  onDismiss: () => void;
  titleKey?: string;   // default 'aiLimit.title'
  bodyKey?: string;    // default 'aiLimit.body'
  testID?: string;     // default 'ai-limit-sheet'
}
```
- testIDs: root `ai-limit-sheet`, dismiss button `ai-limit-sheet-dismiss`.
- `accessibilityLabel` on the dismiss button (human copy), distinct from testID.
- No literal hex / no hardcoded font — tokens only (passes `auxi-lint-tokens.sh`).

### 2. `src/hooks/useAiLimitGate.ts` (new)

Hook shaped like `useAiConsentGate`. Reuses `AI_DAILY_LIMIT_CODE` from
`src/utils/aiError.ts`.
```ts
interface AiLimitGate {
  /** True + opens the sheet iff code is the daily-limit code; else false
   *  (caller handles the error normally). Idempotent while visible. */
  check: (errorCode: string | null | undefined) => boolean;
  sheetProps: { visible: boolean; onDismiss: () => void };
}
```
- `check(code)`: if `code === AI_DAILY_LIMIT_CODE` → set visible, return `true`;
  else return `false`.
- `onDismiss`: hide the sheet; caller decides side-effect (try-on passes a
  callback that also `navigation.goBack()`). Keep the goBack in the screen, not
  the hook, so the hook stays feature-agnostic.

### 3. Wire into `SeeThisOnMeScreen.tsx`

In the error-resolution effect (both the render `status:'error'` branch ~L232
and the shapes error branch ~L209): before/instead of setting the generic error
view, call `gate.check(generation.errorCode)`. If it returns `true`:
- do NOT enter the generic error state (no "Try again" button rendered);
- fire the analytics event once (dedup via the existing `resolvedHashRef`);
- render `<AiLimitSheet {...gate.sheetProps} />` in the tree.
- "Got it" (`onDismiss`) → hide sheet + `navigation.goBack()` (nothing to retry
  today). Swipe/backdrop dismiss = same behavior.

If `check` returns `false`, keep the existing generic error behavior unchanged.

### 4. i18n — new shared `aiLimit.*` keys (tri-locale parity: en/vi/fr)

| key | en-EN | vi-VN | fr-FR |
|---|---|---|---|
| `aiLimit.title` | You've reached today's AI limit | Bạn đã đạt giới hạn AI hôm nay | Vous avez atteint la limite IA du jour |
| `aiLimit.body` | You've used all your AI generations for today. Come back tomorrow for more. | Bạn đã dùng hết lượt tạo bằng AI hôm nay. Quay lại vào ngày mai nhé. | Vous avez utilisé toutes vos générations IA pour aujourd'hui. Revenez demain pour en découvrir plus. |
| `aiLimit.dismiss` | Got it | Đã hiểu | Compris |

Add as a new top-level `aiLimit` object in each of the three translation files;
keep key order/parity identical across locales.

### 5. Analytics (per `.claude/rules/analytics-tracking-required.md`)

- New event `ai_limit_gate_shown` fired once when the gate appears:
  `{ feature: 'try_on', phase: <'render'|'shapes'> }` — literal snake_case names,
  no PII. Goes through `src/services/analytics.ts` `track()`.
- Update `auxi/docs/analytics/mixpanel-tracking-plan.md` §5 (new event, file:line)
  and note it in the try-on funnel (§10) as the terminal "hit daily limit" state.

## Files

**Create**
- `src/components/features/AiLimitSheet.tsx`
- `src/hooks/useAiLimitGate.ts`
- (tests) `src/hooks/__tests__/useAiLimitGate.test.ts`,
  `src/components/features/__tests__/AiLimitSheet.render.test.tsx`

**Modify**
- `src/screens/see-this-on-me/SeeThisOnMeScreen.tsx` — wire the gate for both phases
- `src/translations/{en-EN,vi-VN,fr-FR}.json` — add `aiLimit.*`
- `src/services/analytics.ts` — (only if an event-name constant/allowlist pattern exists) add `ai_limit_gate_shown`
- `auxi/docs/analytics/mixpanel-tracking-plan.md`

## Acceptance criteria

1. On a try-on **render** 429 `ai_daily_limit_reached`: the gate sheet appears
   with the `aiLimit.*` copy; the generic "Try again" error view does NOT render.
2. Same for a **body-shapes** 429.
3. "Got it" dismisses the sheet and returns to the previous screen; there is no
   affordance that re-submits the AI job while over-limit.
4. Any OTHER try-on error (network / server / job_failed / timeout) keeps the
   existing generic error + Try again behavior unchanged.
5. `ai_limit_gate_shown` fires exactly once per limit-resolution (no re-fire on
   re-render).
6. Copy present + at parity in en/vi/fr.
7. Reusable: `AiLimitSheet` + `useAiLimitGate` have no try-on-specific imports.

## Verification gates

- `npx tsc --noEmit` clean (legacy `_HomeScreen.tsx` baseline aside).
- `yarn lint` — no new errors/warnings over baseline.
- `./scripts/auxi-lint-tokens.sh` clean (no hex/font drift in the new sheet).
- Unit tests pass (`gate.check` truth table; sheet renders copy + has no retry testID).
- Post-code: **designer** step-6.5 gate (new UI, HARD GATE) → then qa-mobile smoke.
- JS-only change → Fast Refresh, NO native rebuild.

## Open questions

- None blocking. (Icon choice for the sheet is designer's call at the gate; use a
  sensible existing token/icon until then.)
