# Design Review (RE-GATE) — Favourite screen / RemoveFavouriteDialog motion

**Date**: 2026-06-19
**Reviewer**: designer (step 6.5 hard gate)
**Build**: working tree (uncommitted) · branch `feat/favourite-figma-fidelity`
**Scope**: FOCUSED re-gate of the single prior blocking finding — bottom-sheet
motion timing on `RemoveFavouriteDialog`. Lenses re-run: **2 (motion)** and
**6 (cross-screen)** only. All other lenses unchanged from the prior pass.
**Live render**: not required — this is a code-fact re-check (durations/easings
are static token references).

---

## Verdict: PASS (was FAIL)

The one prior MAJOR (Finding 1) is **RESOLVED**. No open BLOCKER or MAJOR on the
re-run lenses. The PR is **unblocked** from the designer gate.

---

## Prior FAIL — Finding 1 (RESOLVED)

**Was**: MAJOR · Lens 2 motion · `RemoveFavouriteDialog` bottom-sheet ran a tier
too fast vs its two sibling sheets — the open/close timing did not match the
shared Auxi bottom-sheet motion language, so the remove-confirm sheet felt
abruptly snappier than `TemperatureOverrideSheet` / `MoodFeedbackSheet`.

**Now**: on-contract. `RemoveFavouriteDialog.tsx:77`

```
duration: visible ? motion.duration.medium : motion.duration.normal
easing:   visible ? motion.easing.enter   : motion.easing.exit
```

OPEN = `medium` (350ms) + `easing.enter`; CLOSE = `normal` (250ms) +
`easing.exit`. This is exactly the open/close asymmetry the two siblings use.

### Lens 2 — Motion (PASS)

- Durations now on the correct tier: open `medium` 350 / close `normal` 250
  (`motion.ts` tokens, no literals). The previous one-tier-too-fast value is gone.
- Open/close asymmetry preserved — slower eased-in open, faster eased-out close
  (`easing.enter` → `easing.exit`), per `motion-rules.md`.
- Reduce-motion branch (`RemoveFavouriteDialog.tsx:66-71`) **UNCHANGED**:
  `progress.setValue(visible ? 1 : 0)` jumps instantly, unmounts on hide, and
  returns before `Animated.timing` runs. Intact.

### Lens 6 — Cross-screen consistency (PASS)

All three Auxi bottom-sheets now share one motion contract:

| Sheet | Open | Close | Easing (open → close) |
|---|---|---|---|
| `RemoveFavouriteDialog.tsx:77-78` | `medium` 350 | `normal` 250 | `enter` → `exit` |
| `components/features/TemperatureOverrideSheet.tsx:24-25,113,128` | `medium` 350 | `normal` 250 | `enter` → `exit` |
| `components/features/MoodFeedbackSheet.tsx:21-22,83,96` | `medium` 350 | `normal` 250 | `enter` → `exit` |

Same off-screen slide + scrim-fade pattern, same durations, same easings. The
sheet motion is now coherent across screens.

---

## Out of scope (decided — not re-litigated)

- **Finding 2** (`figmaDivider` hairlines) — KEPT as Figma-faithful per CEO directive.
- **Finding 3** (header background @90% white) — KEPT as Figma-faithful per CEO directive.
- Dead `icon_favourite_empty.svg` — removed (confirmed resolved).

These were not re-examined; they carry their prior decision.

---

## Routing

- None. Fix verified on-system. PR may proceed to step 7 (qa-mobile smoke).

## Evidence

- `auxi/src/screens/favourite/RemoveFavouriteDialog.tsx:75-85` (timing block),
  `:66-71` (reduce-motion branch)
- `auxi/src/components/features/TemperatureOverrideSheet.tsx:24-25,110-128`
- `auxi/src/components/features/MoodFeedbackSheet.tsx:21-22,80-96`
- `auxi/src/theme/motion.ts:8-28` (`duration.medium=350`, `duration.normal=250`,
  `easing.enter`, `easing.exit`)
- Rule: `motion-rules.md` (open/close asymmetry, reduce-motion fallback,
  no hardcoded timings)
