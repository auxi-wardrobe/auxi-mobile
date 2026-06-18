# Motion rules — Macgie Motion System v1.0

> Which motion token to use for which interaction. Source of truth:
> `auxi/src/theme/motion.ts` (+ background in `docs/MOTION_SYSTEM.md`, Linear
> AU-333…338). **Do NOT hardcode a timing, distance, easing, scale, or spring in
> a component — reference a token.** The `designer` agent checks this at
> design-review lens 2.

---

## 1. The tokens (from `motion.ts`)

```
duration: instant:50  fast:120  normal:250  medium:350  slow:500  reveal:700   (ms)
distance: xs:4  sm:8  md:16  lg:24  xl:32                                       (px travel)
scale:    press:0.97  hover:1.02  select:1.03  emphasis:1.05
opacity:  hidden:0  subtle:0.6  visible:1
stagger:  tight:40  normal:80  relaxed:120                                      (ms between items)
elevation: sm:2  md:4  lg:8
radius:   small:8  medium:16  large:24  full:999
```

Easing (RN `Easing.bezier`, mirrors the token-doc cubic-beziers):
- `easing.standard` = `(0.2, 0, 0, 1)` — general in-place changes
- `easing.enter` = `(0, 0, 0, 1)` — element entering / opening (decelerate)
- `easing.exit` = `(0.4, 0, 1, 1)` — element leaving / closing (accelerate)
- `easing.emphasized` = `(0.2, 0, 0, 1)` — hero / attention moments

Springs (critically damped, no bounce — for `Animated.spring`):
- `spring.soft` = `{ stiffness:250, damping:30 }`
- `spring.standard` = `{ stiffness:300, damping:35 }`
- `spring.confident` = `{ stiffness:350, damping:40 }`

---

## 2. Token per interaction (the contract)

| Interaction | Duration | Easing / spring | Other | Reference impl |
|---|---|---|---|---|
| **Press feedback** (button/tile down) | — | `spring.standard` | `scale.press` (0.97) on press-in, back to 1 on release | press-down convention |
| Hover / focus lift (where applicable) | `fast` (120) | `standard` | `scale.hover` (1.02) | — |
| Selection emphasis (pill/chip selected) | `fast`–`normal` | `standard` | `scale.select` (1.03) | — |
| **Drawer / sheet OPEN** | `medium` (350) | `easing.enter` | translate by panel width | `Sidebar.tsx:52-64`, `RootDrawer.tsx:38-43` |
| **Drawer / sheet CLOSE** | `normal` (250) | `easing.exit` | translate back | `Sidebar.tsx:66-79`, `RootDrawer.tsx:38-43` |
| Backdrop scrim fade-in (with open) | `medium` (350) | `easing.enter` | `opacity` 0 → ~0.5 | `Sidebar.tsx:58-63` |
| Backdrop scrim fade-out (with close) | `normal` (250) | `easing.exit` | `opacity` → 0 | `Sidebar.tsx:73-78` |
| **List / grid stagger reveal** | per-item `normal`/`medium` | `enter` | `stagger.normal` (80) between items; `tight`(40) dense, `relaxed`(120) hero | — |
| Toast / snackbar in | `medium` (350) | `enter` | at `zIndex.toast` | — |
| Toast / snackbar out | `normal` (250) | `exit` | — | — |
| Hero / attention pulse | `slow` (500)–`reveal` (700) | `emphasized` | `scale.emphasis` (1.05) | — |

**The OPEN=`medium 350`+`enter` / CLOSE=`normal 250`+`exit` asymmetry is the
house signature.** Opens are slower and decelerate (feel deliberate); closes are
faster and accelerate (feel responsive, get out of the way). Both `Sidebar.tsx`
and `RootDrawer.tsx` follow it exactly — a new sheet/drawer that uses one
duration for both directions, or swaps the easings, is a MAJOR finding.

---

## 3. Emotion Motion Layer (don't reinvent)

`applyEmotion(dir, cfg)` (`motion.ts:71`) scales an *existing* duration/stagger
by the user's identity direction (`calm` slower+more stagger, `confident`/
`comfort` faster, `creative` more stagger). It only adjusts duration/stagger —
it never introduces new motion. New animated surfaces that should respond to
identity direction route their `{duration, stagger}` through this helper rather
than hand-tuning per emotion.

---

## 4. Reduce-Motion fallback (required)

Every non-trivial animation MUST honor the OS "Reduce Motion" setting. Use the
shipped hook — do not re-implement:

```ts
import { useReducedMotion } from '../theme/motion'; // motion.ts:95
const reduced = useReducedMotion();
// reduced === true → skip translate/scale, cross-fade or jump to final state
```

When reduced: drop position/scale animation, keep a short `fast` (120) opacity
cross-fade or render the final state immediately. Never trap the user mid-
animation. A new animated surface with no reduce-motion branch is a MAJOR
finding (it is also a qa-ux a11y concern — designer flags the *motion-system*
miss, qa-ux owns the a11y verdict).

---

## 5. Severity at design-review (lens 2)

| Finding | Severity |
|---|---|
| Hardcoded duration / easing / scale / spring literal in a component | BLOCKER |
| Open/close use same duration, or swapped enter/exit easing | MAJOR |
| No `useReducedMotion` branch on a translate/scale animation | MAJOR |
| Stagger present but off-token (e.g. 100ms) where 80/120 fits | MINOR |
| Right tokens, slightly off interaction mapping (cosmetic) | MINOR |
