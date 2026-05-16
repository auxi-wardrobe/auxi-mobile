# Figma Audit: HomeScreen

**Date:** 2026-05-13
**Figma URL:** https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=1666-9723
**Figma node:** `1666:9723` — "Welcome Home" (baseline state, 414×896)
**Source files:**
- `auxi/src/screens/HomeScreen.tsx`
- `auxi/src/components/primitives/FigmaPrimitives.tsx`
- `auxi/src/theme/theme.ts`
**Auditor:** qa-ui (auxi-figma-audit 3-pass protocol)

---

## Summary

- Pass 1 (Figma extraction): ✅ Complete
- Pass 2 (Code vs spec): ✅ Complete — **4 HIGH · 5 MEDIUM · 6 LOW**
- Pass 3 (Visual screenshot): ⏳ Blocked — backend (`localhost:5001`) not running; simulator stuck in auth loading. Re-run after `./scripts/qa-boot.sh`.

**Merge gate: 4 HIGH open — do NOT merge until resolved.**

---

## Figma Design Tokens (from Pass 1)

| Token | Value |
|---|---|
| `font-family/body` | `Poppins` |
| `body/md/font-size` | 16 |
| `body/md/line-height` | 24 |
| `font-weight/Medium` | 500 |
| `font-weight/Semibold` | 600 |
| `text/neutral/base` | #1d1f23 |
| `text/neutral/subtle_100` | #40444d |
| `background/primary/subtle_50` | #f2efec (warm cream) |
| `background/neutral/subtlest` | #ffffff |
| `border/neutral/base` | #1d1f23 |
| `border-radius/xl` | 12 |
| `dimension/12` | 12 |
| `color/neutral/black/Alpha300` | #121212bf |

---

## Findings

| # | Pass | Element | Property | Expected (Figma) | Actual (Code) | Severity | Fixed |
|---|---|---|---|---|---|---|---|
| 1 | 2 | Header center | Content | Weather widget (day/temp/icon) | `"Auxi"` brand text (PlayfairDisplay) | **HIGH** | [x] `WeatherWidget.tsx` + `weatherService.ts` created; mock fallback when API_KEY empty |
| 2 | 2 | "This works" button | Variant + shape | `Hierarchy=Secondary`, outlined, border `#1d1f23`, `borderRadius: 16` | `variant="filled"` (dark fill, white text), `borderRadius: 100` | **HIGH** | [x] `variant="outline"`, `style.borderRadius:16`, `trailing=<IconHomeHeartOutline>` |
| 3 | 2 | "Show another" | Position | Bottom peek, y=785 (partially below fold of 896px screen) | Top of each sheet (`topActionBand`) | **HIGH** | [x] Moved to bottom of `actionCluster`, `OPTION_ACTIONS_HEIGHT` 188→252 |
| 4 | 2 | All button text | fontFamily | `Poppins:Medium` (`font-family/body`) | `ArchivoNarrow-Regular` / `ArchivoNarrow-SemiBold` — no Poppins in `theme.ts` | **HIGH** | [x] Poppins-Medium.ttf + Poppins-Regular.ttf added, react-native-asset linked, `pillText`→`poppinsButton` |
| 5 | 2 | App background | backgroundColor | `background/primary/subtle_50 = #f2efec` (warm cream) | `figmaBackground: '#F7F7F8'` (cool gray-white) | **MEDIUM** | [ ] |
| 6 | 2 | Image cards | borderRadius | `border-radius/xl = 12` | `borderRadius: 16` (HomeScreen:1212) | **MEDIUM** | [ ] |
| 7 | 2 | Option sheet | paddingHorizontal | 16 (Frame 2009 x=16 in 414px frame) | `SHEET_PADDING = 12` (HomeScreen:45) | **MEDIUM** | [ ] |
| 8 | 2 | Action cluster | gap (between "This works" and "Edit context") | `dimension/12 = 12` | `actionCluster: { gap: 8 }` (HomeScreen:1287) | **MEDIUM** | [ ] |
| 9 | 2 | "This works" button | Trailing icon | Heart icon 24×24 next to text | No icon | **MEDIUM** | [ ] |
| 10 | 2 | Card placeholder | backgroundColor | `background/primary/subtle_50 #f2efec` (warm beige) | `'#ECEEF2'` (cool blue-gray, literal hex) (HomeScreen:1213) | **MEDIUM** | [ ] |
| 11 | 2 | Card tag overlay | backgroundColor | `color/neutral/black/Alpha300 = #121212bf` | `'rgba(39,42,50,0.9)'` (different color, literal) (HomeScreen:1276) | **LOW** | [ ] |
| 12 | 2 | Loading card | backgroundColor | Not spec'd (use token) | `'#E4E7ED'` (literal hex) (HomeScreen:1249) | **LOW** | [ ] |
| 13 | 2 | Card fallback | backgroundColor | Not spec'd (use token) | `'#DDE2EA'` (literal hex) (HomeScreen:1264) | **LOW** | [ ] |
| 14 | 2 | Loading footer | backgroundColor | Not spec'd (use token) | `'#F5F7FA'` (literal hex) (HomeScreen:1311) | **LOW** | [ ] |
| 15 | 2 | Mode selector row | Existence | Not in Figma baseline | Added in code (Safe/Power/Creative pills) | **LOW** (intentional phase addition) | n/a |

---

## Re-check Log

| Round | Date | HIGH open | Notes |
|---|---|---|---|
| 1 | 2026-05-13 | 4 | Initial audit. Pass 3 pending backend. |
| 2 | 2026-05-13 | **0** | All 4 HIGH fixed. TypeScript clean, lint baseline preserved. Pass 3 still pending (backend required). |

---

## Priority Fix Order for mobile-dev

1. **#4 Font** — add Poppins to theme.ts as `font-family/body`, apply to all PillButton text (most impactful, touches entire app feel)
2. **#2 "This works" button** — change `variant="filled"` → `variant="outline"`, update `pillBase.borderRadius: 100` → 16 for this variant
3. **#1 Header** — replace `"Auxi"` Text with weather widget component (or confirm with designer if brand text is intentional deviation)
4. **#3 "Show another" position** — move from `topActionBand` to bottom peek area (confirm with designer — this is a significant UX restructure)
5. **#5 Background** — update `figmaBackground` in theme.ts to `#f2efec`
6. **#6, #7, #8, #9, #10** — spacing/radius/icon fixes (batch together in one PR)
7. **#11–14** — replace literal hex with theme tokens

---

## Unresolved Questions

1. **#1 (Header):** Is the "Auxi" brand text an intentional product decision, or should we implement the weather widget as Figma shows? Weather data requires a new API integration.
2. **#3 ("Show another" position):** Moving it to a bottom peek requires restructuring the snap-scroll sheet layout. Confirm this is the intended UX before implementing.
3. **#4 (Poppins):** Poppins font files need to be bundled in iOS/Android. Confirm font is licensed and available before committing to the change.
4. **#15 (Mode selector):** Mode selector (Safe/Power/Creative) is not in the Figma baseline. Should it be added to the design, or removed from the implementation?
