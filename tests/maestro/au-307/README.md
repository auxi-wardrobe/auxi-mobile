# AU-307 — Pin & Build Around — Maestro flows

Three deterministic sub-flows covering the UAC's Maestro coverage default:
**primary** + **replace** + **error retry**. Composed by
`tests/maestro/pin-build-around.yml`.

> Authored by `qa-ui`. Executed by `qa-mobile`. Sim execution is OUT OF SCOPE
> for the author — this directory contains YAML only.

## Files

| File | Purpose |
|---|---|
| `../pin-build-around.yml` | Top-level orchestrator; calls all 3 sub-flows in order |
| `primary-pin.yaml` | Cold Home → pin tile 0 → confirm modal → generate → success |
| `replace-pin.yaml` | Pin tile 1 (different from A) → replace modal → confirm → generate → success. **Depends on `primary-pin.yaml` state** |
| `error-retry.yaml` | Cold Home → pin → forced BE error → Retry. **Requires BE force-error mode** |

## How to run

```bash
# Full suite (BE force-error mode required for sub-flow C)
cd auxi
./scripts/qa-boot.sh                  # umbrella root: boots BE + sim + app
maestro test tests/maestro/pin-build-around.yml \
  -e QA_EMAIL=qa-test@auxi.app \
  -e QA_PASSWORD='QaTest!2026'

# Sub-flows individually
maestro test tests/maestro/au-307/primary-pin.yaml \
  -e QA_EMAIL=... -e QA_PASSWORD=...
maestro test tests/maestro/au-307/replace-pin.yaml \
  -e QA_EMAIL=... -e QA_PASSWORD=...     # only works post-primary state

# Skip error-retry if BE force-error not available
maestro test tests/maestro/au-307/primary-pin.yaml -e ... && \
maestro test tests/maestro/au-307/replace-pin.yaml -e ...
```

## Preconditions

1. **Backend** PR-BE (AU-307) **merged** and BE running on `:5001` with
   `pinned_item_id` accepted by `/api/v05/recommendation/try_another` and
   `/api/v05/recommendation/build`.
2. **iOS sim** booted + app installed via `./scripts/qa-boot.sh`.
3. **Test user provisioned** — `qa-test@auxi.app` / `QaTest!2026` with:
   - Onboarding complete (`is_first_login=false`)
   - Wardrobe seeded with **≥ 4 user-owned items** spanning at least 2
     categories (tops + bottoms). Common-essential items DO NOT count because
     the pin badge is hidden on them (spec §4.1 / HomeScreen line 2298).
4. **Outfit fetch headroom** — a fresh `/recommendation/start` call must
   succeed within `RECOMMENDATION_TIMEOUT_MS` (180s) on the LLM cold path.
5. **Sub-flow C only** — backend in forced-error mode (see Open Question).

## Selector inventory

Every assertion targets a stable `testID`. No text matching, no coords.

| Selector | Where defined | Sub-flows using it |
|---|---|---|
| `home-swipe-deck` | `HomeScreen.tsx:1810` | A, B, C |
| `home-pin-generating-header` | `HomeScreen.tsx:1771` | A, B, C |
| `home-tile-pin-outfit-0-slot-0` | `HomeScreen.tsx:~2399` (unpinned, active card slot 0) | A, C |
| `home-tile-pin-outfit-0-slot-1` | same — active card slot 1, unpinned | B |
| `home-tile-pin-outfit-0-slot-0-set` | `HomeScreen.tsx:~2398` (pinned-state suffix, slot 0) | A, B (precondition) |
| `home-tile-pin-outfit-0-slot-[01]-set` (regex) | same — accepts either slot for post-replace assert | B |
| `home-tile-skeleton-outfit-0-slot-0` | `HomeScreen.tsx:~2352` | A, B |
| `pin-confirm-modal-root` | `PinConfirmModal.tsx:120` | A, B, C |
| `pin-confirm-modal-title` | `PinConfirmModal.tsx:143` | A, B |
| `pin-confirm-modal-image` | `PinConfirmModal.tsx:129` | A, B |
| `pin-confirm-modal-cancel` | `PinConfirmModal.tsx:152` | A, B |
| `pin-confirm-modal-confirm` | `PinConfirmModal.tsx:163` | A, B, C |
| `pin-generation-error` | `PinGenerationError.tsx:38` | C |
| `pin-generation-error-retry` | `PinGenerationError.tsx:44` | C |
| `pin-fallback-notice` | `PinFallbackNotice.tsx:21` | A, B (negative assert) |

Selectors NOT exercised by the 3-flow default (deferred to follow-up
flows when the BE/UX surfaces are reachable deterministically):

- `pin-confirm-modal-scrim` — backdrop-dismiss path (not in spec §8 default)
- `pin-tooltip-unpin` — first-3-pins-per-session tooltip (timing-sensitive)
- `pin-item-unavailable-notice` — 5s ephemeral banner, requires PINNED_ITEM_GONE injection
- `pin-guest-banner` / `pin-guest-signin-cta` — guest auth wall, requires signed-out state
- `item-detail-mix-btn` — ItemDetail → Home auto-pin flow (worth a separate `au-307-item-detail-build-around.yaml` once the basic 3 are green)

## Slot-indexed testIDs (post-BUG-3 fix)

Per-tile testIDs are now slot-indexed by deck position rather than
outfit hash: `home-tile-pin-outfit-<deckPos>-slot-<slotIdx>`. Deck
position is `0` for the active (front) card and `1` for the peek
card behind it. Slot index is the flat tile index within one outfit
(0..N).

Why: the previous `home-tile-pin-<outfitHash>-<slotIdx>` testID + the
`home-tile-pin-.*-N` regex selector + `index: 0` qualifier proved
collision-prone — qa-mobile pass 2 reported a tap landing on the
view-toggle band because the regex matched an offscreen tile from a
peek card. Exact slot-indexed ids let Maestro drop the regex and
hit the right element every time. Deck-position keying also
survives outfit-hash churn from generation, which the hash-keyed
testID didn't.

## Open questions / gaps to coordinate

### 1. Backend force-error mode for `error-retry.yaml` (BLOCKING for sub-flow C)

The phase-07 design assumed `V05_BUILD_FORCE_ERROR=true` on the BE.
**Grep confirmed no such flag exists in `wardrobe-backend/`** as of authoring.

Decision needed from `backend-dev`:

- **Option A (preferred):** add env flag `V05_BUILD_FORCE_ERROR` checked at
  the top of `services/v05_build_service.py::build_v05_for_user()` and
  `try_another_v05_for_user()`. Default `false`. When `true`, raise an
  exception that surfaces as 500 to the FE. Gate in CI / never on in prod.
- **Option B:** Maestro `mockServer` intercept on `/api/v05/recommendation/*`
  returning 500. Heavier setup; documented but defer until Option A
  rejected.
- **Option C:** sub-flow C skipped from default suite, ran manually only
  when force-error is injected by some other means.

Until decided, `error-retry.yaml` will FAIL on
`extendedWaitUntil visible: pin-generation-error` against a healthy BE.
That's intentional — loud failure beats silent skip.

### 2. testID stabilisation (RESOLVED — AU-307 BUG-3 followup)

Landed in `duc2820/au-307-followup-pin-slot-testid`. All per-tile
testIDs in HomeScreen now follow the slot-indexed pattern documented
above (`home-tile-pin-outfit-<deckPos>-slot-<slotIdx>`,
`home-tile-skeleton-outfit-...`, `home-tile-yourpiece-outfit-...`,
`home-tile-outfit-...`). Maestro flows in this directory updated to
use exact ids instead of `home-tile-pin-.*-N` regex.

### 3. Sub-flow ordering coupling

`replace-pin.yaml` deliberately fails fast when run standalone (asserts
`home-tile-pin-outfit-0-slot-0-set` precondition). That keeps the
orchestrator file deterministic AND avoids a duplicate "pin tile 0"
preamble in the sub-flow. If a future contributor wants
`replace-pin.yaml` to be standalone-runnable, add a precondition guard
that calls `primary-pin.yaml` first — don't duplicate the assertions.

### 4. 14 UAC scenarios — not all 14 covered here

The default coverage per spec §8 is the 3 named flows above. The full UAC
manual checklist (DoD spec §12 bullet 3) remains the human verification
step for the remaining scenarios:

- Unpin via tap-on-pinned (UAC #4)
- Remix while pinned (UAC #5)
- Rapid taps debounce (UAC #6)
- No compatible → fallback (UAC #7)
- Pinned unavailable mid-flight (UAC #8)
- Network timeout error vs API error message (UAC #9 + #10)
- ItemDetail "Build around this" → auto-pin (UAC #11)
- Guest auth wall (UAC #12)
- i18n vi-VN / fr-FR copy parity (UAC #13)
- a11y labels (UAC #14)

Adding Maestro coverage for any of these is a follow-up — file with
`qa-ui` if you want one prioritised.
