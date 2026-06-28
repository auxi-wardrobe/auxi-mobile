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
| `home-wear-this-generating-spinner` | `HomeScreen/index.tsx` (Wear-this CTA loading state) | A, B, C |
| `home-tile-pin-.*-0` (regex) | `HomeScreen.tsx:2300-2304` (unpinned suffix) | A, C |
| `home-tile-pin-.*-1` (regex) | same — flatTileIndex 1, unpinned | B |
| `home-tile-pin-.*-set` (regex) | same — pinned-state suffix | A, B |
| `home-tile-skeleton-.*` (regex) | `HomeScreen.tsx:2259` | A, B |
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

## Why regex testIDs (`home-tile-pin-.*-0`)

Per-tile testIDs are keyed by the dynamic `outfit.outfitHash`, so a literal
match isn't possible without coupling the flow to a specific outfit. Regex
+ `index: 0` is the established convention (see `maestro/flows/wardrobe/
item-detail-open.yaml` and `_shared/open-first-wardrobe-item.yaml`).

The stable selector that would let us drop the regex is a `data-testid`
keyed by slot rather than hash — e.g. `home-tile-pin-slot-0`. Flagged below
as a testID gap.

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

### 2. testID stabilisation (proposed for mobile-dev)

Same pattern as `wardrobe/item-detail-open.yaml` README note. Proposed
additions to `HomeScreen.tsx`:

- `home-tile-pin-slot-0`, `home-tile-pin-slot-1` (slot-indexed, hash-free
  alias) on each pin badge. Today's hash-keyed testID stays for
  outfit-identity assertions; the slot alias gives Maestro a crisp anchor.
- Equivalent slot alias on `home-tile-skeleton-slot-0` etc.

If/when added, the flows here can drop the `.*` regex + `index: 0`
combo and read like the rest of the suite.

### 3. Sub-flow ordering coupling

`replace-pin.yaml` deliberately fails fast when run standalone (asserts
`home-tile-pin-.*-set` precondition). That keeps the orchestrator file
deterministic AND avoids a duplicate "pin tile 0" preamble in the sub-flow.
If a future contributor wants `replace-pin.yaml` to be standalone-runnable,
add a precondition guard that calls `primary-pin.yaml` first — don't
duplicate the assertions.

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
