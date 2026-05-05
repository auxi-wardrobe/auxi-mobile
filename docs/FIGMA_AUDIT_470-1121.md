# Figma Audit — Page `470:1121` ↔ `auxi/` Codebase

**Figma file**: Auxi (`0nXXMAR4Arf1ZfjtQvtBh0`)
**Page**: `✅ Hifi-design (RFD)` — `nodeId 470:1121`
**Method**: Figma Plugin API via `use_figma` (no screenshots) — node-tree extraction + sticky-note text reading.
**Scope**: 19 top-level children → 6 SECTION + 11 standalone frames + 2 standalone TEXT notes.
**Date**: 2026-05-05

---

## 1. Page structure

| # | Section | nodeId | Children | MVP status |
|---|---|---|---|---|
| 1 | onboarding | `470:1122` | 9 | ✅ MVP |
| 2 | Home adjust | `909:7328` | 32 | ✅ MVP (main flow) |
| 3 | Setting | `1032:1208` | 6 | ✅ MVP |
| 4 | wardrobe | `909:11258` | 25 | ✅ MVP |
| 5 | **NOT in MVP** | `1777:8121` | 22 | ❌ Designer-blocked |
| 6 | Future - MIX tool | `1917:9591` | 9 | ❌ Future scope |

Two standalone TEXT notes outside any section (mood-check copy):
- `1977:4834` — "Light or sharp today? Light / Sharp"
- `1977:4835` — "Where's your energy today? Low / Steady / High"

---

## 2. Designer sticky notes (18 substantive / 6 template-only)

### Home adjust (11 notes)

| nodeId | Designer note | Code reference |
|---|---|---|
| `909:7793` | "When user clicks the heart icon → the app lists all outfits they clicked Yes" | `auxi/src/services/wardrobeService.ts:7` `STYLE_TAG_FAVORITE`; `auxi/src/screens/HomeScreen.tsx:325` `heartButton` ✅ — **but the dedicated favorites-list screen is missing** ⚠️ |
| `1752:27646` | "User can unlike an outfit they've chosen" | `wardrobeService.ts:394` `toggleWardrobeItemFavorite` ✅ |
| `1752:27660` | "User can mix with a selected item — **DO NOT BUILD IN MVP**" | No code present — matches intent ✅ |
| `909:7794` | "Chips logic — Shuffle to see other chips, Edit to open keyboard. Surprise the user with a different style sometimes." | `HomeScreen.tsx:225` `handleShuffleSuggestions`; `:244` `handleOpenContextEdit` ✅ |
| `1727:19257` | "Auto-open this screen when user swipes/tries **3 times** without finding a favorite outfit" | ❌ **CRITICAL — no swipe counter in `HomeScreen.tsx`** |
| `909:7796` | "When user clicks 'find more context' open keyboard but only allow predefined contexts; AI free-text comes later" | `components/features/ContextChipsModal.tsx` has predefined chips ✅; AI free-text correctly deferred |
| `909:7802` | "Items saved to favorites → system should know reasons → suggest better; don't repeat the same outfit within x days" | Backend logic — not verifiable from mobile |
| `1672:11783` | "**Pin feature** — keep favorite item then mix with other items" | ❌ **CRITICAL — no pin code in `HomeScreen.tsx`** (Figma has dedicated frame `1711:17062 "Welcome Home / pin item"`) |
| `1752:28109` | "**3 modes**: Safe Choice (lazy/blend in) / Power Choice (impressive/energy) / Creative Choice (refresh/experiment)" | ❌ **CRITICAL — no mode selector found in code** |
| `909:7805` | "User can download the AI photo" | ❌ Not implemented |
| `1774:8086` | (template only — designer left blank) | — |

### Wardrobe (7 notes)

| nodeId | Designer note | Code reference |
|---|---|---|
| `909:7803` | "Wardrobe sorted by latest items so what user uploaded has more priority" | ❌ No `sort` / `orderBy created_at` found in `WardrobeScreen.tsx`; might be backend-side — verify |
| `909:7801` | "User can mark item as **less used**; user **cannot edit/delete common (system) items**, only items they uploaded" | ✅ `STYLE_TAG_LESS_USED` at `wardrobeService.ts:8` and `ItemDetailScreen.tsx:357`. System-item permission rule not verified in UI. |
| `1688:13996` | "To reduce friction, user can add items from **Auxi's database**" | ✅ `DatabaseScreen.tsx` + `WardrobeScreen.tsx:613` `search-database-modal` |
| `1064:1168` | "**Auto remove background**" | ❌ No remove-bg code in `itemService.ts` / `wardrobeService.ts` |
| `1699:16659` | "AI may auto-tag many tags (material, price...) but the current UI/design only shows **Type, Color, Fit, Style**" | ✅ `ItemDetailScreen.tsx:40` `EditableField = 'category' \| 'color' \| 'fit' \| 'style'` matches the 4 fields. ❌ AI auto-tag for material/price not visible. |
| `1064:1110`, `1064:1848`, `1064:2440` | (template only) | — |

### NOT in MVP (4 notes — explicitly excluded)

| nodeId | Note |
|---|---|
| `1752:27673` | "Full setting — DO NOT BUILD IN MVP" |
| `1688:15978` | "Do not need to build this feature in the MVP" |
| `1699:16672` | "After clicking SELECT: show all images → user picks 1 to go to next step" (future import flow) |
| `1752:27977` | "AI beauty — DO NOT BUILD IN MVP" |
| `1777:11256` | (template) |

### Standalone TEXT notes (mood-check copy)

| nodeId | Text | Code |
|---|---|---|
| `1977:4834` | "Light or sharp today? — Light / Sharp" | ❌ Missing |
| `1977:4835` | "Where's your energy today? — Low / Steady / High" | ❌ Missing |

---

## 3. Figma → Code screen mapping

| Figma section / frame | Description | Code (file:line) | Match |
|---|---|---|---|
| `470:1122` onboarding (9 frames) | Welcome + ask flow | `WelcomeScreen.tsx`, `LocationPermissionScreen.tsx`, `GenderPreferenceScreen.tsx` (legacy), `PreferenceSeedScreen.tsx` / `FitPreferenceScreen.tsx` / `OutfitApprovalScreen.tsx` / `OnboardingConfirmationScreen.tsx` (new) | ⚠️ Dual flow — product decision pending per `auxi/CLAUDE.md` |
| `auxi-ask01-m / -w / -u` (`909:7193`, `909:7210`, `909:7227`) | Gender-specific variants | `GenderPreferenceScreen.tsx` (single shared file) | ⚠️ Figma has 3 variants, code has 1 generic |
| `flash-screen` × 9 (`1727:19422`, `1727:19462`, `1727:19442`, `1977:4683`, `1977:4733`, `1977:4783`, `1977:4633`, `1727:19270`, `1783:11535`) | Splash screens | None | ❌ Not implemented |
| `909:7328` Home adjust → Welcome Home variants | Home recommendation surface | `HomeScreen.tsx:139` | ✅ Base layout |
| `1711:17062` Welcome Home / pin item | Pin feature variant | None | ❌ Missing |
| `1666:9869` love | Love (heart) action | `HomeScreen.tsx:325` heartButton + `favouriteService.ts` | ✅ |
| `1667:2731` love collection | Favorites list screen | None | ❌ Missing |
| `1667:2385` / `1711:17169` / `1667:2589` context (×3) | Context chips modal | `components/features/ContextChipsModal.tsx` | ✅ |
| `1667:3696` detail | Item detail | `components/features/ItemDetailBottomSheet.tsx` + `ItemDetailScreen.tsx` | ✅ |
| `1671:5470` / `1671:5693` / `1671:5623` detail AI - loading (×3) | AI loading states | Generic loading exists; AI variants not separated | ⚠️ |
| `1818:4087` change item / wardrobe | Mix tool | None — explicitly DO NOT BUILD per note `1752:27660` | ✅ Correctly excluded |
| `1671:3770` select photo | Body reference photo | `BodyScreen.tsx` | ✅ |
| `909:11161` Menu open | Sidebar | `components/layout/Sidebar.tsx` | ✅ |
| `909:11258` wardrobe → grid | 4-column wardrobe grid | `WardrobeScreen.tsx` | ✅ |
| `1687:13266` database + `1688:13521` database selected | DB items picker | `DatabaseScreen.tsx` (313 LOC) + search modal | ✅ |
| `1688:13923` add success / `1688:15118` save success | Success toast | snackbar in `HomeScreen.tsx` | ✅ |
| `1688:15439` add item-loading | Upload loading | `WardrobeScreen.tsx` | ✅ |
| `1688:15190` detail item / categories, `1688:14656` FIT, `1688:14985` Style, `1688:14797` color | Edit-field tabs | `ItemDetailScreen.tsx:40` 4 fields | ✅ |
| `1032:1208` Setting (6 frames) | Settings flow | `SettingsScreen.tsx` (23 KB) | ⚠️ Spot-check needed |
| `1671:6300` body photo | Body settings | `BodyScreen.tsx` | ✅ |
| `1777:8121` NOT in MVP (22 frames) | Future scope | None | ✅ Correctly excluded |
| `1917:9591` Future - MIX tool (9 frames) | Future remix/moodboard | None | ✅ Correctly excluded |

---

## 4. Findings

### CRITICAL — required by designer, missing in code

1. **3 modes (Safe / Power / Creative)** — note `1752:28109`. No mode selector in `HomeScreen.tsx`. This is a core UX feature; almost certainly required.
2. **Pin feature** — note `1672:11783` + frame `1711:17062`. Pin a favorite item then mix with others. No code path.
3. **Auto-open "find more context" after 3 unsuccessful swipes** — note `1727:19257`. No swipe counter in `HomeScreen.tsx`.
4. **Mood-check screens** — TEXT `1977:4834` ("Light or sharp today?") and `1977:4835` ("Where's your energy today?"). No corresponding screen. Likely belongs in onboarding or as a daily check — confirm with the designer.
5. **Auto remove background** on upload — note `1064:1168`. No remove-bg call in `itemService.ts` / `wardrobeService.ts`. Could be backend — verify in `wardrobe-backend/`.
6. **Love collection screen** — frame `1667:2731` + note `909:7793`. Heart action exists; the dedicated list view of liked outfits does not.

### WARNING — partial or unverified

1. **Dual onboarding flow** — Figma has gender-specific variants (`auxi-ask01-m / -w / -u`); code has a single shared `GenderPreferenceScreen.tsx`. `auxi/CLAUDE.md` already flags this as "Onboarding redesign... product decision pending."
2. **Flash-screen** — 9 splash frames in Figma; not implemented in RN.
3. **Wardrobe sort by latest** — note `909:7803`. No client-side sort visible; backend may already sort — verify.
4. **AI auto-tag (material, price)** — note `1699:16659`. UI matches the 4 fields shown today; AI side appears not wired.
5. **Download AI photo** — note `909:7805`. No download function.
6. **Detail AI loading (×3 variants)** — Figma separates 3 loading states; code has generic loading.

### INFO — confirmed alignments

1. **Sections explicitly excluded from MVP are correctly absent in code**: mix tool, AI beauty, full setting, import, mood-check sub-section under "NOT in MVP".
2. **6 / 24 sticky notes are template-only** (`1064:1110`, `1064:1848`, `1064:2440`, `1774:8086`, `1777:11256`, plus the description sub-frames of populated notes) — designer left them blank. Safe to ignore.
3. **Tag-edit fields** match Figma exactly: `'category' | 'color' | 'fit' | 'style'` in `ItemDetailScreen.tsx:40` ↔ Type / Color / Fit / Style frames.
4. **System-item edit-permission rule** (note `909:7801`) — `STYLE_TAG_LESS_USED` exists but the "cannot edit/delete common items" rule is not verified end-to-end in UI.

---

## 5. Recommended next actions

### High priority — clarify with designer / CEO before coding

- Confirm **3 modes (Safe / Power / Creative)** is in MVP. If so, this is a major addition to `HomeScreen` — plan it as a dedicated phase.
- Confirm **Pin feature** scope (Figma has the frame and the note; code has neither).
- Confirm placement of **mood-check** ("Light or sharp", "Energy") — onboarding step? daily? sidebar?
- Resolve **dual onboarding flow** — swap to new, keep both, or delete legacy.

### Medium priority — implementable once scope is clear

- Add a **swipe counter** in `HomeScreen.tsx` to auto-open context modal after 3 unsatisfied swipes.
- Add **love collection** screen (list of `is_favorited` outfits).
- Add **download AI photo** action.
- Decide whether to differentiate the **3 AI loading states** Figma defines.

### Verify in `wardrobe-backend/`

- Auto remove background on upload.
- Wardrobe sort by latest.
- AI auto-tag for material / price.
- System-item edit/delete permission rule.

---

## 6. Method notes

- All findings extracted via `figma.getNodeByIdAsync` + `findAllWithCriteria({types:['TEXT']})` against the Figma Plugin API runtime (`use_figma` MCP tool).
- `get_metadata` tool was unstable ("session expired"); `get_design_context` and `get_variable_defs` required a layer to be selected on Figma desktop. Both were bypassed via `use_figma`.
- Sticky-note text was filtered to drop the standard template strings ("Name goes here...", "Thank you!", contact card, "🗒", "V").
- 4 stickies (`1774:8086`, `1064:1110`, `1064:1848`, `1064:2440`, `1777:11256`) returned only the unfilled component template; treated as "no designer note" rather than missing data.
- Code references verified by `grep` against `auxi/src/`. Backend behavior (`wardrobe-backend/`) was not inspected — items marked "verify" are explicit gaps in the audit scope.
