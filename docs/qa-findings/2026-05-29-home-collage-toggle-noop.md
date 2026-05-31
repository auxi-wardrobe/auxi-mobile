# Home collage toggle is a no-op — collage surface never renders

**Severity**: critical (core feature of the branch is non-functional)
**Repro rate**: 1/1 runs of `collage-toggle.yaml`
**Build**: auxi `2c2205b8` · branch `feat/home-collage-canvas-play`
**Device**: iOS Simulator — iPhone 16 Pro, iOS 18.1
**Failing flow**: `auxi/maestro/flows/home/collage-toggle.yaml`
**Failing step**: `assertVisible: id=home-collage-0` (after `tapOn home-footer-tab-collage`)

## Summary
Tapping the footer collage toggle (`home-footer-tab-collage`) does not switch the
Home sheet's middle region from the grid to the collage canvas. The button is
present, enabled, and the tap registers (Maestro COMPLETED), but the view stays on
the grid: `home-tile-0-0` remains, `home-collage-0` never mounts, and the footer
grid icon stays active. No crash, no backend call.

## Maestro log excerpt
```
14:42:56.914  Tap on id: home-footer-tab-collage COMPLETED
              (element: accessibilityText=Collage view, resource-id=home-footer-tab-collage,
               bounds=[209,767][275,815], enabled=true, selected=false)
14:43:09–15   Assert that id: home-collage-0 is visible  (polled ~6s, never matched)
14:43:15.028  CommandFailed: Assertion is false: id: home-collage-0 is visible
```

## Hierarchy / artifacts
- `logs/maestro/collage-toggle-debug/.maestro/tests/2026-05-29_144221/maestro.log`
- Failure screenshot (still grid): same dir `screenshot-❌-1780040595149-(collage-toggle.yaml).png`
- Findings copies:
  - `auxi/docs/qa-findings/screenshots/2026-05-29/qa-mobile-collage-after-toggle-tap.png`
  - `auxi/docs/qa-findings/screenshots/2026-05-29/qa-mobile-collage-grid-view.png`

## Evidence detail
- Post-tap UI is identical to pre-tap grid (confirmed by Maestro capture @14:43 and
  live `simctl` capture @14:47).
- Footer left grid icon highlighted/active; right collage icon inactive after tap.
- Grid renders **real** outfit item images (shirt / skirt / loafers), not mock data —
  so the image pipeline is fine; defect is isolated to the view toggle.

## Suspected area
`auxi/src/screens/HomeScreen.tsx` — footer view-toggle state handler + the
conditional render that should mount `home-collage-0` when collage mode is active.
The `home-footer-tab-collage` onPress likely doesn't update the toggle state, or the
collage branch of the render isn't wired (the `home-footer-tab-collage-active` testID
also never appears in the captured hierarchy).

## Routing
- **mobile-dev** (UI/state) — wire the collage toggle to mount the collage surface.
- NOT backend (no API call, no 5xx).
- NOT qa-ui (flow is correct: selectors valid, tap lands on the right element).
