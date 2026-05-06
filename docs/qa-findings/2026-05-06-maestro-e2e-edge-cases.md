# Maestro E2E — Edge Cases & Bugs Found

**Date:** 2026-05-06
**Reviewer:** orchestrator (running flows from `auxi/maestro/flows/`)
**Build:** `auxi-mobile/main` @ `d0a106d` (PR #7 + #8 + #9 merged)
**Stack:** `./scripts/qa-boot.sh` — backend `:5001`, Metro `:8081`, iOS sim iPhone 16 Pro / iOS 18.1

This is a running list of edge cases and real bugs surfaced while
running the Maestro flows end-to-end. Each item is either:
- **Fixed in YAML** — the flow had wrong assumptions (timeouts, syntax, selectors)
- **Fixed in code** — real product bug or testID gap
- **Tracked, not fixed** — known/deferred behavior or external (OpenAI flakiness)

## Fixed in YAML

### E-1 — Wrong bundle id in flow `appId`
**Severity:** blocker (flows wouldn't launch the app at all)
**Symptom:** `Maestro: launchApp` fails — bundle id mismatch.
**Root cause:** YAMLs hardcoded `org.reactjs.native.example.auxi`. The
actual installed bundle id is `com.auxi2026.app` (resolved by
`qa-boot.sh` from `pbxproj`).
**Fix:** `sed -i '' 's/org.reactjs.native.example.auxi/com.auxi2026.app/'`
across `auxi/maestro/config.yaml` + 3 flow files.

### E-2 — `assertVisible: timeout` is invalid Maestro syntax
**Severity:** blocker (every flow with a custom timeout crashed at parse)
**Symptom:** `> Unknown Property: timeout` thrown before any step ran.
**Root cause:** I added `timeout:` directly under `assertVisible:` —
not a real Maestro property. For per-step timeouts use `extendedWaitUntil`.
**Fix:** Replaced every timed assertion with:
```yaml
- extendedWaitUntil:
    visible:
      id: <id>
    timeout: <ms>
```
in `_shared/login.yaml`, `auth/login.yaml`, `home/swipe.yaml`.

### E-3 — `clearState: true` on iOS does NOT wipe Keychain
**Severity:** critical (login phase silently no-ops, cold-flow runs as warm-flow)
**Symptom:** `auth-email-input` not visible after `launchApp{clearState:true}`.
The app booted straight into Home from the previous run's saved JWT.
**Root cause:** Maestro's `clearState` clears app data, NOT the iOS
Keychain. RN Keychain entries persist across reinstalls / clears.
**Fix:** Added `clearKeychain: true` to every `launchApp` that's meant
to start unauthenticated. Documented in `_shared/login.yaml` with a
comment explaining the iOS-only quirk.

### E-4 — `home-outfit-sheet-0` plain `assertVisible` after login
**Severity:** critical (entire Home flow timed out before LLM returned)
**Symptom:** Maestro fails almost immediately on the first home assertion.
**Root cause:** `/recommendation/start` triggers an LLM call to
gpt-5-nano which takes **~30 seconds** on the warm path — and 60-90s+
when OpenAI returns 502 (see E-7). The default `assertVisible` timeout
is too short to wait for the response.
**Fix:** Wrap the post-login assertions in `extendedWaitUntil` with
`${RECOMMENDATION_TIMEOUT_MS}` (180 000 ms = 3 min). Documented inline
in `home/swipe.yaml`.

### E-5 — Default `clearState` between flows leaves saved state
**Severity:** major (test isolation broken — sheet 0 stayed `saved` between runs)
**Symptom:** Bottom "This works" button rendered as disabled
"Saved to favourite" because favouriteService had recorded the outfit
on a previous run. Tapping was a silent no-op.
**Root cause:** Same as E-3 — without `clearKeychain`, the previous
session's saved-favourite state persisted.
**Fix:** Same as E-3 (clearKeychain wipes auth → fresh user state).

### E-6 — Flow assumed a two-way heart toggle; product is one-way
**Severity:** major (assertion never matched intended behavior)
**Symptom:** `assertVisible: home-heart-toggle` after a saved-state
tap fails — the heart never returns to idle.
**Root cause:** Heart save is currently one-way. From `HomeScreen.tsx:416`:
> "Already saving / already saved — no-op (matches the legacy heart
> delete. PHASE B/D follow-up: extend the service with a real `toggle`)"
**Fix:** Removed the un-save assertions from `home/swipe.yaml` section 2
(heart toggle). Added a comment pointing at the source where the
deferral is documented. Re-add when PHASE B/D ships.

## Fixed in code

### E-8 — Bottom CTAs (`home-this-works`, `home-show-another`, `home-edit-context`) had non-unique testIDs
**Severity:** critical (Maestro tapped sheet 0's button regardless of which sheet was visible)
**Symptom:** Maestro `tapOn: home-this-works` registered as `COMPLETED`
but the active sheet's saveState didn't change, because Maestro hit
sheet 0's (offscreen, already-saved) button — a no-op.
**Root cause:** `HomeScreen.tsx` rendered each `OptionSheet` with a
hardcoded `testID="home-this-works"` (and same for `home-show-another`
/ `home-edit-context`). All N rendered sheets shared the same
testID — Maestro's tree query picked the first match.
**Fix:** Made the three bottom-CTA testIDs index-aware:
```tsx
testID={`home-show-another-${sheetIndex}`}
testID={`home-this-works-${sheetIndex}`}
testID={`home-edit-context-${sheetIndex}`}
```
Updated `home/swipe.yaml` to use `home-this-works-1` etc. Same approach
the agent already used for `home-outfit-sheet-{N}` and `home-tile-{N}`
(those were unique) — these three were the holdouts.

## Tracked, not fixed

### E-7 — OpenAI returning 502 with 60-second `Retry-After` (transient)
**Severity:** external (no project-side fix possible)
**Symptom:** `/recommendation/start` and mode-change requests can take
70-90s+ during OpenAI rough patches.
**Root cause:** OpenAI/Cloudflare returning `502 Bad Gateway` with
`Retry-After: 60`. Backend's openai client retries (2 retries left,
60s sleep each) — adds ~60-120s to user-perceived latency.
**Mitigation in flows:** `RECOMMENDATION_TIMEOUT_MS=180000` and
`MODE_TIMEOUT_MS=90000` to absorb at least one retry.
**Possible product follow-ups (separate scope):**
- Show a retryable error UI on the second 502 instead of silently
  retrying for 2+ minutes.
- Hedge the LLM call to a backup provider (Anthropic/Gemini) on 5xx.
- Pre-warm the OpenAI client at backend boot so the first call doesn't
  pay TLS+DNS cost on top of LLM latency.

### E-10 — Maestro can't see RN `<Modal>` contents on iOS
**Severity:** test-coverage gap (the feature works in the app)
**Symptom:** After tapping "Edit context", `assertVisible: id=context-chips-modal-root` (and even text-based assertions on the modal's chip labels) fails — Maestro reports the elements as not visible. Manual visual inspection on the sim confirms the modal IS rendering.
**Root cause:** `ContextChipsModal` uses React Native's `<Modal>` component, which on iOS is rendered into a separate `UIWindow`. Maestro's iOS hierarchy traversal doesn't reliably cross that window boundary, so the modal's testIDs and text content aren't reachable via the same query that works for the main app window.
**Fix in flow:** Removed the modal-content assertions from section 5c of `home/swipe.yaml`; the tap on `home-edit-context-1` is still recorded (so we know the button is present and reachable), but we don't assert what happens after.
**Possible product follow-ups (separate scope):**
- Replace `<Modal>` with an absolutely-positioned `<View>` overlay in the same window — Maestro can see it, and the visual result is identical with `animationType="none"`.
- Or wait for Maestro to add iOS Modal hierarchy support (open feature request upstream).
- Or extend the test stack with an Appium driver that can switch UIWindow contexts.

### E-11 — Login was forced on every flow; cold-login is the slowest step
**Severity:** flow-design issue (the user flagged it explicitly: "every E2E run logs in again — wastes time")
**Symptom:** Every test run ran `_shared/login.yaml` which `clearKeychain: true` + types credentials + waits for `/recommendation/start` (30-90s+). Running 5 different flows in a session paid that cost 5×.
**Root cause:** Sub-flow design — every test uniformly ran cold-login as setup, even tests that only care about post-login screens.
**Fix:** Added `_shared/ensure-home.yaml`:
- Launches the app with `clearState: false` and **does NOT** clear Keychain.
- Conditional `runFlow when:visible: auth-email-input` — only falls into `login.yaml` if the app actually shows Login (i.e. keychain is empty/expired).
- Otherwise skips the login sub-flow entirely (Maestro logs `SKIPPED`).
After the FIRST run in a fresh sim, every subsequent run reuses the seeded JWT and Home loads in seconds, not minutes. `auth/login.yaml` still uses `_shared/login.yaml` directly because it explicitly tests login + relaunch persistence.

### E-9 — Recommendation cold-call is ~30s end-to-end on the happy path
**Severity:** UX concern (not a bug)
**Symptom:** First Home render after login shows skeleton placeholders
for ~30s before outfit data lands.
**Root cause:** gpt-5-nano `/chat/completions` cold call. Model is
chosen for cost; latency is the trade-off.
**Possible product follow-ups:**
- Cache last-known-good outfit in AsyncStorage and render it
  optimistically on launch while the new one fetches.
- Pre-fetch on app foreground (not just home-mount) so re-entries are
  instant.

## Test outcomes (latest run)

| Flow | Status |
|---|---|
| `auth/login.yaml` | ✅ PASS — cold login + relaunch (Keychain persistence) verified |
| `home/swipe.yaml` | ✅ PASS — swipe / heart save / pin / mode pills / Show another / This works all green. Edit-context modal assertion deferred per E-10. Login is now SKIPPED on subsequent runs (E-11). |

(This file is updated after each run.)
