# AU-391 — Temperature override should reset to Live Weather on app terminate/reopen

- **Ticket:** [AU-391](https://linear.app/duncan-1/issue/AU-391/bug-app-should-reset-to-default-location) · `[bug]` · Auxi team
- **Branch:** `duc2820/au-391-bug-app-should-reset-to-default-location`
- **Repo / scope:** `auxi/` (React Native) **only**. No backend change.
- **Status:** Ready to implement
- **Priority:** Bug, low effort (~1 file + tests)

## Problem

The ticket title says "default location" but the description is about the **manual
temperature override**, not GPS:

> When user changes the temperature and forgets to switch back, the system should
> auto-return to **Live Weather** when the app is terminated / reopened.

The override feature (AU-362) lets the user replace live weather with a fixed
temperature bucket (hot/mild/cold/freezing) to preview outfits. Today that override
**persists for the rest of the calendar day** via AsyncStorage, so a terminate→reopen
on the same day restores the override instead of returning to Live Weather. That is
the bug.

## Root cause

All in `src/hooks/useTemperatureOverride.ts`:

- `:30` — override persisted under AsyncStorage key `@auxi/temp_override` as
  `{ bucketKey, dateISO }`.
- `:77-101` — rehydration `useEffect` restores the override on mount whenever
  `dateISO === today` (`:89`). Same-day cold start ⇒ override comes back.
- `:113-120` — `apply()` writes the override to AsyncStorage; it only clears on an
  explicit switch back to `weather` or a date rollover.

The original design comment (`:9-12`, "Persistence (D3)… survives same-day reloads")
is exactly the behavior the PM now wants reversed.

## Decision

**Reset trigger = cold start only** (confirmed with product). Override survives
backgrounding within a session; a true terminate→reopen returns to Live Weather.

**Approach: make the override session-only (in-memory).** Remove AsyncStorage
persistence entirely. On a real terminate→cold-reopen the JS context is recreated and
the hook initializes at `DEFAULT_TEMPERATURE_BUCKET_KEY = 'weather'` automatically —
no lifecycle listener needed. Minimal change, matches the ticket literally (KISS/YAGNI).

> Rejected alternatives: AppState listener resetting on every foreground (nukes the
> override when the user just checks a notification); "reset after N minutes
> backgrounded" (adds AppState + timestamp complexity for no requirement). Both are
> strictly more code than deleting the persistence.

## Changes

### 1. `src/hooks/useTemperatureOverride.ts` (the only behavioral change)

- Delete the rehydration `useEffect` (`:77-101`).
- In `apply()` remove the AsyncStorage `setItem`/`removeItem` block (`:113-120`); keep
  the synchronous ref sync (`:110-111`) + `setActiveBucketKey` (`:112`).
- Delete now-dead code: `STORAGE_KEY`, `PersistedOverride` interface, `todayISO()`, the
  `AsyncStorage` import, and `isTemperatureBucketKey`/`isOverrideBucket` imports if no
  longer referenced after the edit (keep whatever `apply`/return still use).
- Rewrite the file docstring (`:9-12`) to state the override is **session-only and
  resets to Live Weather on app restart** (drop the "Persistence (D3)" paragraph).
- The public hook API (`UseTemperatureOverride`) is unchanged — `HomeScreen`,
  `TemperatureOverrideSheet`, `TemperatureOverrideIndicator` need no edits.

### 2. No analytics change — but guard one regression

Existing events live in `src/services/analytics.ts`
(`temperature_override_active` `:200`, `temperature_override_removed` `:207`, etc.) and
fire on **user** actions only. The silent cold-start reset is not a user action:
**do not** fire `temperature_override_removed` (or any event) from it — that would
pollute the funnel. Since we only delete persistence and touch no handler, no event
fires on restart by construction; just confirm during review that no tracking call was
added to the reset path. No `mixpanel-tracking-plan.md` update required (no new/changed
event).

## Tests

No test file exists for this hook today — add `src/hooks/__tests__/useTemperatureOverride.test.ts`
(or the repo's conventional location) covering:

1. **Cold-start reset (core):** with `@auxi/temp_override` pre-seeded in the AsyncStorage
   mock, a fresh `renderHook(useTemperatureOverride)` initializes `activeBucketKey ===
   'weather'` / `isOverrideActive === false` (override is NOT restored).
2. **apply() is in-memory:** `apply('hot_28_40')` sets `activeBucketKey`,
   `overrideTempC === 33`, `overrideTempCRef.current === 33`, `isOverrideActive === true`,
   and writes **nothing** to AsyncStorage (`setItem` not called).
3. **clear():** returns to `weather`, `overrideTempC === null`, `isOverrideActive === false`.
4. Remove any prior persistence/rehydration assertions (there are none today).

## Verification gates

```bash
cd auxi
nvm use
npx tsc --noEmit
yarn lint
yarn test src/hooks   # or the path to the new test
./scripts/auxi-lint-tokens.sh        # no UI change, should stay clean
```

Manual smoke (qa-mobile, sim): apply a non-"weather" bucket on Home → header shows the
override indicator → fully terminate the app (swipe-kill) → reopen → header shows Live
Weather and a fresh recommendation uses live temp. Also confirm backgrounding→foreground
(no kill) **keeps** the override.

## Risks / notes

- **Behavior reversal of AU-362 "D3":** intentional and product-approved. Update the
  AU-362 design note/comment so the two don't read as contradictory.
- **In-memory only ⇒ no cross-launch memory at all.** That's the desired outcome; the
  daily-expiry concept is removed along with persistence (nothing left to expire).
- **Ownership:** mobile-dev implements in `auxi/`. This plan was authored from the
  backend session only because that's where the ticket was opened; backend is untouched.
  No `API_DOCUMENTATION.md` impact.
- **UI/design gate:** no visual change (same components, same tokens), so the
  designer/qa-ui Figma gates don't apply — this is a pure logic fix.

## Todo

- [ ] Edit `useTemperatureOverride.ts` (remove persistence, update docstring)
- [ ] Confirm no leftover imports / dead code; `tsc` clean
- [ ] Add `useTemperatureOverride.test.ts` (cold-start reset + in-memory apply/clear)
- [ ] Run tsc / lint / tests / token lint
- [ ] Sim smoke: kill→reopen resets; background→foreground keeps
- [ ] Update AU-362 docstring/design note re reversed persistence
- [ ] PR on `duc2820/au-391-…` → review → merge
