# Pin-button Figma adjudication — Compare mode

- **Date:** 2026-06-21
- **Agent:** qa-ui (Compare mode)
- **Branch:** `feat/pin-item-figma-flow`
- **Figma file:** Auxi — https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=3140-5959
- **Flow:** "Pin an item flow" (section `3140:5959`)
- **Live sim:** BLOCKED by toolchain redbox (see §5). Verdict stands on Figma + code evidence (conclusive without sim).

---

## TL;DR verdict

**Figma matches NEITHER pattern wholesale — it is a SPLIT.** The dispute was framed as
old-vs-new for one affordance, but Figma uses **two different affordances for two
different states**:

| State | Figma shows | OLD code | NEW code (current) | Who's right |
|---|---|---|---|---|
| **Pinned** | WHITE "Tap to unpin" pill, on-tile top | icon-only badge + 2px ring + off-tile band | WHITE "Tap to unpin" pill ✅ | **NEW** (designer round-1 correct) |
| **Idle (un-pinned)** | faint icon-only pin BADGE, top-right | faint icon-only badge ✅ | DARK "Pin" labeled pill ❌ | **OLD** (CEO correct) |
| Ring around pinned tile | NONE | 2px ring | none ✅ | NEW (ring is not in Figma at all) |
| Off-tile band tooltip | NONE (only on-tile pill) | off-tile band | none ✅ | NEW (band not in Figma) |

So: **both sides are partly right.** The CEO is correct that Figma's *idle* affordance
is an icon-only badge, not a labeled pill. The round-1 designer was correct that Figma's
*pinned* affordance is the white "Tap to unpin" pill. The OLD pattern's **ring + off-tile
band are pure inventions — neither appears anywhere in Figma.**

---

## 1. Figma spec (evidence)

### 1a. Pinned tile — white "Tap to unpin" pill

Frame `3140:8026` "pin seletected" → tile `3140:8151` "Image 3:4" (denim jacket).
The pinned tile carries pill frame `3399:18412` "unpin":

```
3399:18412 "unpin"  (x=67, y=8, w=112, h=34)  — ON the tile, near top
├── 3399:18413 "Rectangle 105"  — white rounded-full background (100×32)
└── 3399:18414 "Frame 2169"     — flex row, gap 4
    ├── 3399:18415 text "Tap to unpin"  — Inter 10px/12, color/neutral/800 #1D1F23
    └── 3399:18416 instance "icons"     — 17×17 pin-slash glyph
```

Variable defs (node `3399:18412`):
- pill bg = `color/neutral/white/Base #FFFFFF`
- text/icon = `color/neutral/800 #1D1F23` (ink)
- type = `body/xxs` → Inter 10px, line-height 12, letter-spacing 0

Screenshots:
- `docs/design-reviews/screenshots/260621/figma-3140-8026-pin-selected-frame.png` (full screen — pinned denim tile top-left, white "Tap to unpin" pill; **no ring, no off-tile band**)
- `docs/design-reviews/screenshots/260621/figma-3140-8151-pinned-tile.png` (the pinned tile alone — white pill clearly on-tile)
- `docs/design-reviews/screenshots/260621/figma-3399-18412-unpin-pill.png` (pill close-up — "Tap to unpin" + pin-slash icon)

> Note: tile `3140:8151` ALSO contains a stray text node `3140:8161` "Touch to unpin"
> (x=79,y=19,w=71,h=12) sitting behind/under the pill. It is not visible in the rendered
> screenshot — a leftover/occluded label from an earlier iteration. The visible, on-top
> affordance is the `3399:18412` pill. Do not treat `3140:8161` as a second affordance.

### 1b. Idle tile — faint icon-only pin badge

Frame `3140:5995` "Home 1/3" → `3227:23868` "suggestion layouts" (idle grid, nothing pinned).
Every un-pinned tile shows a **faint, translucent, icon-only pin badge** in the top-right
corner — a small rounded square with a low-opacity pin glyph. **No text label.**

Screenshots:
- `docs/design-reviews/screenshots/260621/figma-3140-5995-home-idle-grid.png` (full idle home)
- `docs/design-reviews/screenshots/260621/figma-3227-23868-idle-tiles-badge.png` (4 tiles — each with a faint top-right icon-only badge, NO "Pin" text)

This is the OLD idle affordance the dispute describes (`rgba(255,255,255,0.3)`-ish faint badge).
Figma does NOT show a dark labeled "Pin" pill in the idle state.

---

## 2. Current code

`src/components/features/PinTilePill.tsx` — single component, two states:
- **idle** → DARK pill (`backgroundColor: ds.color.ink`), cream text `uacTextPrimaryBase #f2efec`, copy `t('pin.pin_cta')` ("Pin") + pin glyph. Top-center (`alignSelf:'center'`, `top: spacing.s`).
- **pinned** → WHITE pill (`ds.color.white`), ink text `ds.color.ink`, copy `t('pin.tooltip_unpin')` ("Tap to unpin") + pin glyph. Top-center.

`src/screens/HomeScreen.tsx` `renderTile` (L2698-2742):
- Renders exactly one `<PinTilePill>` per non-system tile (L2734-2740). No ring on `styles.card`. No off-tile band (removed; comment L2726-2727 + L2548-2550 confirm).
- Long-press on the tile is a secondary unpin toggle; pill is primary.

---

## 3. Verdict (per affordance, with node-id evidence)

### Pinned state → NEW pill is CORRECT (matches Figma `3399:18412`)
Pixel-and-token match: white bg (`#FFFFFF`), ink text (`#1D1F23`), Inter `body/xxs` 10px,
4px gap, pin glyph, on-tile near top, copy "Tap to unpin". The NEW `PinTilePill` pinned
state reproduces this exactly. The OLD pinned pattern (icon badge + 2px ring + off-tile
band) does **not** appear in Figma. **Designer round-1 was right; the white pill IS in Figma.**

### Idle state → OLD badge is CORRECT (matches Figma `3140:5995` / `3227:23868`)
Figma idle tiles show a faint **icon-only** pin badge top-right. The NEW code renders a
DARK **labeled "Pin"** pill top-center instead. This is a divergence FROM Figma. **CEO is
right about the idle affordance** — Figma does not show a labeled "Pin" pill on un-pinned tiles.

### Ring + off-tile band → correctly DROPPED (not in Figma)
The OLD 2px ring around the pinned tile and the off-tile "Touch to unpin" band tooltip are
**not present anywhere** in the Figma flow (checked frames `3140:5995`, `3140:8026`,
`3140:7577`, `3140:7503`, `3171:9988`). Dropping them in the NEW code is correct.

---

## 4. Other pin-button fidelity deltas vs Figma

| # | Delta | Figma | Code | Severity |
|---|---|---|---|---|
| D1 | **Idle affordance shape** | faint icon-only badge, top-RIGHT (`3227:23868`) | dark labeled "Pin" pill, top-CENTER | **HIGH** — primary divergence; CEO's point |
| D2 | Pill horizontal position (pinned) | pill frame `3399:18412` x=67 in a 189-wide tile → roughly centered, slightly right of center (visually center-top) | `alignSelf:'center'` (true center) | LOW — visually equivalent; acceptable |
| D3 | Stray occluded `3140:8161` "Touch to unpin" text in pinned tile | present but hidden behind pill | N/A | INFO — Figma cruft, not a code issue. Flag to designer to clean the source. |
| D4 | Idle badge corner | top-RIGHT in Figma | top-CENTER in code | MEDIUM — follows from D1; if idle stays a badge it must move to top-right |

---

## 5. Live sim status — BLOCKED (toolchain, not feature)

Attempted live capture on iPhone 16 Pro (`9DCBFE8A...`). App cold-launched to a redbox:

```
No script URL provided. Make sure the packager is running or you have
embedded a JS bundle in your application bundle.
unsanitizedScriptURLString = (null)
```

Root cause: **Metro is not listening on :8081** (`curl localhost:8081/status` empty, no
LISTEN socket, no metro process) and the debug build has no embedded bundle. This is the
documented Xcode 26.5 ↔ RN 0.83.1 env blocker class, NOT a defect in the pin feature.
Per env instructions, did NOT rebuild (`yarn ios`). Screenshot of the redbox:
`docs/design-reviews/screenshots/260621/qa-ui-app-home.png`.

The Figma + code evidence is conclusive on its own — the live screenshot would only have
confirmed what the source already proves. Verdict is not weakened by the sim block.

---

## 6. Recommendation / routing

**The dispute resolves to: the NEW pill is right for the PINNED state, the OLD badge is
right for the IDLE state.** Recommended resolution (routes to mobile-dev, pending CEO sign-off
on the idle treatment since it's a taste/UX call the designer originally flagged):

1. **Keep** the white "Tap to unpin" pill for the **pinned** state (matches Figma, ship as-is).
2. **Change idle** affordance back toward Figma: faint icon-only pin badge, **top-right**, NOT
   a labeled "Pin" pill. (This was the designer round-1's one over-reach — round-1 generalized
   the pinned pill to the idle state; Figma does not.)
   - Caveat the implementer should raise: the designer's documented reason for the dark idle
     pill (M2 — the faint translucent badge is "near-invisible on light garments") is a real
     legibility concern. If CEO wants legibility AND Figma fidelity, the resolution is a CEO/
     designer call on idle badge contrast — not a qa-ui call. **ESCALATE the idle-badge
     contrast-vs-fidelity tradeoff to CEO.**
3. Ask designer to delete the stray occluded `3140:8161` "Touch to unpin" text in the Figma
   source (D3) to prevent future misreads.

**Token note:** pinned pill uses `#FFFFFF` + `#1D1F23` correctly via `ds.color.white` /
`ds.color.ink` — no token drift. No `figma-theme-sync` needed for the pinned pill.

---

## Unresolved questions
- Idle affordance: revert to Figma faint icon-badge (CEO's read) vs keep dark legible pill
  (designer M2 legibility) — **CEO decision required** (fidelity vs legibility tradeoff).
- Does CEO want the idle badge top-RIGHT (Figma) or is top-center acceptable if kept as a pill?
