# qa-ui Compare — First-time Home coach-mark overlay

- **Date:** 2026-05-30
- **Branch:** feat/home-collage-canvas-play
- **Component:** `src/components/features/SwipeCoachMark.tsx`
- **Figma:** fileKey `0nXXMAR4Arf1ZfjtQvtBh0` · overlay node `3140:9520` (frame `3140:9395`)
- **Sim:** iPhone (`9DCBFE8A-EE9E-4AD6-8F45-91B3F7AC5916`) · bundle `com.auxi2026.app`
- **MCP pre-flight:** `mcp-doctor.sh` EXIT=0 (sim booted, WDA :8100, mobile-mcp @0.0.56)

---

## Pass 1 — Figma spec (source of truth)

From `get_variable_defs` + `get_design_context` on `3140:9520`:

| Element | Token | Value |
|---|---|---|
| Scrim fill | background/primary/bold_600 | `#262421` @ opacity 0.70, full-screen |
| Dialog bg | background/neutral/subtlest | `#ffffff` |
| Dialog radius | border-radius/2xl | `16` |
| Dialog width | — | `366`, vertically centered (top 1/2, translateY -50%), left:24 |
| Title block | — | flex col, items center, gap16, pt24/px24/pb4 |
| Icon | material-symbols:swipe-outline | 54×54, fill `#070707` (icon/primary/bold_700) |
| Headline | Text-md/Regular | Poppins Regular 16/24, color `#1d1f23` (text/neutral/base), center, "Swipe left or right to explore different outfit options." |
| Actions block | — | flex col items-end, pt12/pb24/px24 |
| "Got it" button | Text button (470:2533) Hierarchy=Text, State=Enable, Size=56 | h56, full-width, content radius 100, Poppins Medium 16/24, color `#1d1f23`, transparent container |

Figma screenshot: `docs/qa-findings/screenshots/2026-05-30/figma-coachmark-3140-9520.png`

## Pass 2 — Code (style → spec mapping)

All theme tokens resolve to exact Figma values (no drift):

| Code style | Resolves to | Figma | Match |
|---|---|---|---|
| `scrim.backgroundColor` figmaCtaLabel | `#262421` | `#262421` | ✓ |
| `scrim.opacity` 0.7 | 0.70 | 0.70 | ✓ |
| `dialog.backgroundColor` white | `#FFFFFF` | `#ffffff` | ✓ |
| `dialog.borderRadius` uacPanel | 16 | 16 | ✓ |
| `dialog.width` | 366 (maxWidth 90%) | 366 | ✓ (clamped responsively) |
| `titleBlock` gap m / pt l / px l / pb xs | 16 / 24 / 24 / 4 | 16 / 24 / 24 / 4 | ✓ |
| `IconSwipeHand` w/h | 54×54 | 54×54 | ✓ |
| svg fill | `#070707` (hardcoded) | `#070707` | ✓ value-correct |
| `headline` poppinsBody | Poppins-Regular 16/24 ls0 | Poppins Regular 16/24 | ✓ |
| `headline.color` uacTextBase | `#1d1f23` | `#1d1f23` | ✓ |
| `actions` pt uacDimension12 / pb l / px l | 12 / 24 / 24 | 12 / 24 / 24 | ✓ |
| `gotItButton` height uacButtonHeight | 56 | 56 | ✓ |
| `gotItText.color` uacTextBase | `#1d1f23` | `#1d1f23` | ✓ |
| PillButton `variant=text` | borderWidth0, transparent, pad0, radius100 | transparent text button radius100 | ✓ |
| "Got it" font (poppinsButton via textOnly) | Poppins-Medium 16/24 | Poppins Medium 16/24 | ✓ |

Style-array order verified: `pillBase(h56) → textButton(h40) → gotItButton(h56)` → final height 56 (last wins). Correct.

## Pass 3 — Sim screenshot overlay-compare

Trigger: removed AsyncStorage `@auxi/coachmark/swipe-home` flag → terminate → relaunch → Home loaded outfits → overlay fired.

Screenshots:
- Full: `docs/qa-findings/screenshots/2026-05-30/qa-ui-coachmark-overlay.png`
- Dialog crop: `docs/qa-findings/screenshots/2026-05-30/qa-ui-coachmark-dialog-crop.png`

Pixel-measured (sim screenshot is 1206px wide, 2× scale):

| Check | Measured | Expected | Result |
|---|---|---|---|
| Scrim luminance | sim RGB(99,96,93) | figma RGB(104,102,100) / math (103,102,100) | ✓ matches (delta = non-white content behind) |
| Scrim coverage | full-screen behind dialog | full-screen | ✓ |
| Dialog centering (H) | left 30.0pt / right 30.5pt | symmetric | ✓ centered |
| Dialog centering (V) | center_y 1310 vs screen 1311 | centered | ✓ |
| Dialog width | ~90% of viewport (clamped) | 366 / clamps on narrow vp | ✓ |
| Dialog radius | 16, white | 16 white | ✓ |
| Icon | present, dark #070707, ~54, centered | 54 #070707 | ✓ |
| Headline copy | exact match | exact | ✓ |
| Headline align/font | centered, Poppins Regular dark | centered Poppins Regular | ✓ |
| "Got it" | present, centered, Poppins Medium, dark | text button Poppins Medium #1d1f23 | ✓ |

Note: first visual impression suggested scrim "too light", but pixel sampling proved scrim opacity/color is correct — the screenshot reads light only because Home content behind is bright. No defect.

## Dismiss / shows-once behavior

| Step | Result |
|---|---|
| Tap "Got it" (testID `home-coachmark-got-it`, logical ~201,500) | overlay closes, Home interactive ✓ |
| Flag persisted | AsyncStorage `@auxi/coachmark/swipe-home` = `'true'` ✓ |
| Terminate + relaunch | Home loads outfits, overlay does NOT reappear ✓ |

## Defects

| # | Severity | Area | Description |
|---|---|---|---|
| — | — | — | None. No blocking or cosmetic defects found. |

Observations (non-defect):
- **OBS-1 (info):** svg `icon_swipe_hand.svg` uses hardcoded `fill="#070707"` rather than `currentColor`. Value is correct vs Figma so no visual drift; flagged only as a convention note (currentColor would future-proof recoloring). Not a defect for this single-color usage.
- **OBS-2 (info):** dialog `width:366` is clamped by `maxWidth:'90%'` on this viewport (603pt logical). Renders centered at ~90% width — responsive guard, intended, matches Figma proportionally.

---

## VERDICT: PASS

All three passes clean. Figma tokens map 1:1 to theme tokens (no color/font/spacing/radius/opacity/icon-size drift), sim render matches the Figma overlay on scrim, dialog geometry/centering, icon, headline copy+style, and "Got it" style. Dismiss + persist + shows-once behavior all verified. No blocking defects.
