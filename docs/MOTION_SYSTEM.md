# Macgie Motion System — v1.0

> **Status:** Canonical design rule. This is the single source of truth for all
> motion (animations, transitions, gestures, loading, reveals) in the Macgie /
> Auxi app. When a motion choice conflicts with a principle here, the principle
> wins.
>
> **Source:** PO hand-off, Linear AU-333 (parent) and children:
> [AU-333 Philosophy](https://linear.app/duncan-1/issue/AU-333) ·
> [AU-334 Emotion Motion Layer](https://linear.app/duncan-1/issue/AU-334) ·
> [AU-335 Pattern Library](https://linear.app/duncan-1/issue/AU-335) ·
> [AU-336 Principles](https://linear.app/duncan-1/issue/AU-336) ·
> [AU-337 Personality](https://linear.app/duncan-1/issue/AU-337) ·
> [AU-338 Tokens](https://linear.app/duncan-1/issue/AU-338).
>
> **In code:** consume via `src/theme/motion.ts` (`motion.duration.*`,
> `motion.easing.*`, `motion.spring.*`, `motion.distance.*`, `motion.scale.*`,
> `motion.stagger.*`). Never hardcode timing/distance/easing — use a token.

---

## 1. Philosophy (AU-333)

Motion exists to support **understanding, confidence, and emotional alignment** —
not decoration, entertainment, or spectacle. If motion does not improve
understanding, **do not animate**.

Macgie helps people make daily clothing decisions, often during uncertainty
("What should I wear? Does this feel right?"). The purpose of motion is to create
**clarity**, not excitement. Every animation should help the user understand:
what changed · why it changed · what matters now · what to focus on next.

Motion should feel **calm, intentional, supportive, human, thoughtful**. The
emotional outcome is *"I feel more certain"* — never *"that animation was
impressive."*

---

## 2. Personality (AU-337)

Every motion must express: **Calm · Intentional · Supportive · Human · Thoughtful · Premium**.

Avoid: playful · bouncy · cartoonish · hyperactive · attention-seeking · gamified · competitive.

**Tone scale — Macgie always sits on the LEFT:**

```
Calm        ●──────────────  Energetic
Supportive  ●──────────────  Competitive
Thoughtful  ●──────────────  Playful
Confident   ●──────────────  Excited
Refined     ●──────────────  Dramatic
Guided      ●──────────────  Stimulating
```

It should feel like *a thoughtful stylist making a suggestion* / *a calm morning
routine* — **not** a game rewarding actions or social media chasing attention.

**Personality filter — before shipping any animation, all six must be "yes":**
Does it feel calm? intentional? supportive? human? thoughtful? premium? If any
answer is no, revise.

---

## 3. Principles (AU-336)

1. **Animate meaning, not interfaces** — animate the object that changed (card →
   detail), not whole-screen fades.
2. **Preserve continuity** — everything has a logical origin and destination. No
   teleporting / sudden appear-disappear.
3. **Prioritize focus** — only important elements move; the most important moves
   first; no competing simultaneous motion.
4. **Reveal progressively** — control information density; never show everything
   at once.
5. **Transform, don't replace** — expand/evolve/update-in-place over remove-and-insert.
6. **Maintain context** — never lose the user's place; prefer skeletons / in-place
   refresh over blank screens and full-screen spinners.
7. **Feel responsive** — acknowledge input instantly (see timing budget below).
8. **Feel physical** — natural acceleration/deceleration, perceived weight;
   ease-out or critically-damped springs; **no linear, no bounce, no overshoot**.
9. **Support hierarchy** — animation intensity reflects importance (recommendations
   / daily reveal > cards / filters > labels / icons).
10. **Reduce cognitive load** — if an animation doesn't make the decision easier,
    remove it.
11. **Feel calm** — supportive, not stimulating; never gamified or reward-seeking.
12. **Feel prepared** — curated, not generated; assembled, not loaded; introduced,
    not displayed.
13. **Consistency creates trust** — reuse established patterns; don't invent new
    motion when an existing pattern solves it.
14. **Motion is part of the recommendation** — *how* an outfit appears shapes
    perceived confidence/quality; never mechanical, never random.
15. **Accessible** — honor Reduced Motion (see §7); motion enhances usability, is
    never required for it.

**Responsiveness budget (Principle 7):** immediate feedback 50–100ms · micro
100–200ms · state changes 200–350ms · navigation 250–450ms · major reveals
400–700ms.

**Decision framework — if these can't be answered clearly, don't animate:**
what changed? why is motion needed? what should the user notice? where does it
come from / go to? does it reduce load? does it support the decision? is it on
personality? can it be simpler?

---

## 4. Tokens (AU-338)

> Build every animation from these. Do not invent custom values.

### Duration
| Token | Value | Use |
|---|---|---|
| `instant` | 50ms | immediate feedback, input ack |
| `fast` | 120ms | button press, toggle, selection feedback |
| `normal` | 250ms | **default** — card interactions, state changes, content updates |
| `medium` | 350ms | navigation, bottom sheets, detail transitions |
| `slow` | 500ms | major transitions, recommendation reveals |
| `reveal` | 700ms | Daily Reveal, Outfit Assembly (signature). **Never longer.** |

### Distance
| Token | Value | Use |
|---|---|---|
| `xs` | 4px | feedback, small emphasis |
| `sm` | 8px | **default** — card entrances, content reveals |
| `md` | 16px | navigation transitions, panel movement |
| `lg` | 24px | full-section transitions (sparingly) |
| `xl` | 32px | major layout transitions (rare) |

### Scale
| Token | Value | Use |
|---|---|---|
| `press` | 0.97 | button press, card tap |
| `hover` | 1.02 | hover/focus |
| `select` | 1.03 | selection confirmation |
| `emphasis` | 1.05 | important reveal moments (sparingly) |

### Opacity
`hidden` 0% · `subtle` 60% · `visible` 100%. Prefer movement **+** opacity; avoid opacity-only.

### Stagger
`tight` 40ms (small groups) · `normal` 80ms (**default** — outfit assembly, progressive reveal) · `relaxed` 120ms (daily reveal, calm).

### Elevation
`sm` +2dp (subtle) · `md` +4dp (card lift) · `lg` +8dp (major focus, sparingly).

### Corner radius (for expand transforms)
`small` 8px · `medium` 16px · `large` 24px · `full` 999px. Interpolate between existing radii to preserve continuity.

### Easing
| Token | cubic-bezier | Use |
|---|---|---|
| `standard` | (0.2, 0, 0, 1) | **default** — most transitions |
| `enter` | (0, 0, 0, 1) | entering elements, reveals |
| `exit` | (0.4, 0, 1, 1) | exiting elements |
| `emphasized` | (0.2, 0, 0, 1) | important content, recommendation moments |

Avoid: linear, elastic, bounce, overshoot-heavy springs.

### Spring (critically damped — no bounce)
| Token | Stiffness | Damping | Use |
|---|---|---|---|
| `soft` | 250 | 30 | card interactions, selection |
| `standard` | 300 | 35 | **default** spring |
| `confident` | 350 | 40 | navigation, confident interactions |

### Layer
`primary` (may animate first) · `secondary` (animates after primary) · `static` (background, stays stable).

---

## 5. Pattern Library (AU-335)

Reuse these; don't invent new patterns when one fits.

| # | Pattern | Motion | Duration |
|---|---|---|---|
| 01 | **Tap feedback** | scale 100→97→100% | 80–120ms |
| 02 | **Card lift** | Y 0→−4px, shadow +10%, no bounce | 150–200ms |
| 03 | **Card expand** (summary→detail) | scale 98→100%, Y 8→0, opacity 0→100; expand from origin, no screen fades | 280–350ms |
| 04 | **Bottom-sheet reveal** | translateY 100%→0, backdrop fades together | 300–350ms |
| 05 | **Progressive content reveal** | A → +80ms → B → +80ms → C | 300–500ms |
| 06 | **Outfit Assembly** *(signature)* | Top→Bottom→Shoes→Accessories→Details, 80ms stagger; "the outfit came together" | 450–650ms |
| 07 | **Daily Reveal** *(signature, most important)* | Weather→Context→Mood→Outfit→Reasoning; create anticipation, never rush | 500–700ms |
| 08 | **Wardrobe growth** | scale 95→100%, opacity 0→100; satisfying not celebratory | 250–350ms |
| 09 | **Collection reordering** | FLIP; items move, never disappear/reappear | 250–300ms |
| 10 | **Selection state** | scale 100→103→100%, subtle, no bounce | 120–180ms |
| 11 | **Success state** | checkmark draw or subtle scale; confident not celebratory | 250ms |
| 12 | **Error state** | opacity shift + small Y 4–8px; never shake, never flash red, stay calm | 200ms |
| 13 | **Skeleton loading** | shimmer / progressive fill; never large centered spinners; context stays visible | continuous |
| 14 | **Navigation push** | X +16→0, opacity 0→100; direction = progression | 250–350ms |
| 15 | **Navigation back** | X 0→+16, opacity 100→0; reverse of push | 250–350ms |

---

## 6. Emotion Motion Layer (AU-334)

`Final Motion = Base Motion System + Emotion Motion Layer`. The emotion layer
only **modifies existing patterns** (duration, stagger, easing, sequencing,
reveal strategy) — it never introduces new motion. It adapts to the user's
**desired identity**, not their current mood, and must stay subtle (if the user
consciously notices it changed, it's too strong).

Five system states only — never generate others (no excited/hyper/chaotic/etc.):

| Direction | Goal | Adjustments |
|---|---|---|
| **Calm** | focus, reduced pressure | duration +15% · stagger +30ms · scale ≤1.01 · reduced movement |
| **Confident** | decisive, in control | duration −10% · minimal stagger · sharper ease-out · focused movement |
| **Creative** | exploration, discovery | +1 reveal layer allowed · stagger +40ms · deeper sequence |
| **Social** | presence, expression | scale +0.01 · vertical movement +2px · normal stagger |
| **Comfort** | familiar, low effort | intensity −20% · reduced movement · simplified transitions/reveals |

---

## 7. Reduced Motion (AU-335 / Principle 15)

When the OS "Reduce Motion" setting is on: remove large movement, **keep** opacity
transitions, **keep** state feedback, **keep** hierarchy. The user must still
understand what changed, where they are, and what happens next. Gesture-driven
flows must provide a non-gesture equivalent (e.g. buttons).

---

## 8. How to apply

1. Pick the **pattern** (§5) that matches the interaction. Don't invent one.
2. Build it only from **tokens** (§4).
3. Apply the **Emotion Layer** (§6) modifier for the active identity direction
   (default = `Confident`/`standard` when none is set).
4. Run the **personality filter** (§2) and **decision framework** (§3).
5. Provide the **Reduced Motion** fallback (§7).
