# Figma Extraction — Settings Redesign (5 frames)

> Phase 1 artifact for the canonical Figma→RN workflow. **Extraction only — no code in this task.**
> After save: auto-dispatch `qa-ui` (review-extraction mode) to audit this note vs Figma BEFORE any `.tsx` edit.

- **Figma file**: `0nXXMAR4Arf1ZfjtQvtBh0` (Auxi)
- **Section**: "Setting" — node `2850:15839` (frames laid out side by side)
- **URL**: https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-15839
- **Frame size**: all 414 × 896 (iPhone-class). Light theme confirmed (white surface, near-black text).
- **Target screen(s)**: `src/screens/SettingsScreen.tsx` (818 LOC, redesign), `src/screens/BodyScreen.tsx` (frame 5 context).
- **Extracted**: 2026-05-26 via Figma MCP (get_metadata → get_design_context → get_variable_defs → get_screenshot per frame).

---

## 0. TL;DR — what changes vs current code

| Area | Current code | Figma redesign | Action |
|---|---|---|---|
| **Body font family** | ArchivoNarrow (`archivoBody` 16/24 ls .15) | **Poppins** Regular 16/24 ls 0 | NEW token needed (`poppinsBody` exists — Poppins-Regular 16/24 ls 0 — REUSE) |
| **Primary text color** | `figmaText` #272A32 | **#1d1f23** (`text/neutral/base`) | Token drift — see §Tokens |
| **Big time font** | ArchivoNarrow 44/48 | **Poppins Bold 32/40** ls −0.64 | drift |
| **Dialog title** | ArchivoNarrow 24/32 | **Inter SemiBold 16/24** (small) | drift |
| **Switch ON / radio accent** | blue `#3AA0D8` (hardcoded) | **green `#039855`** (`fixed/success/base`) | NEW token + hardcode removal |
| **Primary btn (Update)** | `figmaAction` #272A32, radius 16 | **#121212** (`background/neutral/bold_400`), radius 16 | drift (#272A32 → #121212) |
| **Delete btn (Delete-data dialog)** | hardcoded `#D34F3E` | **#bb251a** (`background/danger/bold_100`) = existing `figmaDestructive` | hardcode removal — use token |
| **Main list rows** | `Daily Time`, `Style Direction`, `Privacy control`, `Manage body photo`, `Delete data`, `Version` | + **"Your information"** (chevron) + **"Dark Mode"** (toggle) | 2 NEW rows |
| **Version string** | `APP_VERSION = '0.0.1'` | shows **"1.0.3"** | flag mismatch (don't hardcode 1.0.3) |
| **Style-direction CTA label** | "Update Focus" | **"Update"** | copy change |
| **Delete dialog primary label** | "Reset preferences" | **"Delete"** | copy change |
| **Icons** | `ChevronRight`, hand-drawn `DeleteGlyph` | M3 `arrow_right`, `delete`, `check_small`, radio | per-icon audit §Icons |

---

## 1. SHARED SYSTEM (header, list-item, tokens, icons)

### 1.1 Header (instance `2850:15914`, 414×107)
Shared `header` component instance appears on every frame (same one used by Home Grid / current Settings: menu button left, title centered, action right).
- **Vars**: `background/neutral/subtlest` #ffffff (surface), `text/primary/bold_700` #070707 (title), `icon/neutral/base` #1d1f23.
- Title font in this header instance resolves to **Inter SemiBold 16/24** per var defs, but the *visible* Setting title renders bold/centered "Setting" — current code already implements header via `playfairDisplaySection` ("Settings" Playfair). **Header is NOT in scope to re-extract**: current code's header (menu + title + feedback icon) is preserved. Title copy in Figma = "Setting" (singular) vs current "Settings". **Open question Q1** — keep "Settings"? (likely yes; ignore Figma's singular.)
- Header height token: `spacing.uacHeaderHeight = 107` matches.

### 1.2 List-item system ("List Item / 0 Density", M3 baseline, node 483:1564)
The whole main list is built from M3 `List Item / 0 Density` components. Reference geometry (from `setting` frame `2850:15840`):
- **List container**: left/right inset **27px** (x=27, width=360 inside 414). Current code uses `paddingHorizontal: 27` — matches.
- **List item body vertical padding**: `py-8` (8px top+bottom) per item Body.
- **Single-line row content height**: 24px text, row min-height effectively **40–48px**.
- **Divider**: M3 `Divider` instance, full width 360, **1px**, color = `border/primary/subtle_300` **#eee6df** (NOTE: lighter than current `figmaDivider` #D1D3D8 — **drift**, see Tokens).
- **Row label**: Poppins Regular 16/24, ls 0, color #1d1f23.
- **Trailing value** (e.g. "Stay Balanced", "Weekdays"): Poppins Regular 16/24, right-aligned, color #1d1f23, in a 200px-wide right frame.
- **Trailing icon** (`arrow_right`, `delete`): 24×24, `icon/neutral/base` #1d1f23 (delete row icon is neutral in main list per metadata — the *label* "Delete data" is the red part; confirm in §Frame 1).

### 1.3 Switch component (M3 Switch, node 1032:2388)
- Size **52 × 32**, radius 100.
- **ON**: track bg `fixed/success/base` **#039855** (green), white handle pushed right (handle 32px container w/ inner thumb).
- **OFF**: (Dark Mode toggle in screenshot) grey track, grey thumb left. M3 default off track ≈ `#e4e7ec`/outline; exact off-token not bound — treat as **needs token / confirm** (see Q2). Current code uses `#D6D8DE` off / `#3AA0D8` on (hardcoded blue) — both need updating: ON → #039855, OFF → neutral grey token.

### 1.4 Tokens — Figma var → theme.ts mapping

| Figma variable | Value | theme.ts token | Status |
|---|---|---|---|
| `text/neutral/base` | `#1d1f23` | `uacTextBase` (#1d1f23) ✅ exists | **REUSE** `uacTextBase` (or add `figmaTextBase`) — current screen uses `figmaText` #272A32 → drift |
| `text/primary/bold_700` | `#070707` | `figmaTextDark` (#070707) ✅ | REUSE (header title) |
| `fixed/success/base` / `icon/success/base` | `#039855` | — none | **NEW token** `figmaSuccess` / `figmaToggleOn` = #039855 |
| `background/neutral/bold_400` | `#121212` | — none (closest `figmaAction` #272A32) | **NEW token** or accept — primary button bg. Recommend `figmaButtonDark` = #121212. **Q3** |
| `background/danger/bold_100` | `#bb251a` | `figmaDestructive` / `uacTextDangerBase` (#bb251a) ✅ | **REUSE** — replaces hardcoded #D34F3E |
| `red` (body detail Delete) | `#cc4c3e` | `figmaRed` (#CC4C3E) ✅ | REUSE (case-insensitive match) |
| `border/primary/subtle_300` | `#eee6df` | `figmaCaptionPillBg` (#eee6df, semantic mismatch) | **NEW semantic token** `figmaListDivider` = #eee6df (don't reuse caption-pill name). Current uses `figmaDivider` #D1D3D8 → drift. **Q4** |
| `background/primary/subtle_200` | `#eee6df` | `figmaInsightPillBg` (#e0d2c4 ✗) — note: subtle_200 = #eee6df here | body-photo detail bg = #eee6df. NEW/REUSE `figmaListDivider` value, but semantic = surface. **Q5** |
| `background/primary/subtle_50` | `#f2efec` | `figmaBackground` (#f2efec) ✅ | REUSE |
| `background/neutral/subtlest` | `#ffffff` | `figmaSurface` / `white` ✅ | REUSE |
| `background/overlay/dark/10` | `#8271371a` (≈ rgba(130,113,55,0.1)) | — none | dialog scrim is a different solid (see §Frame 2). **Q6** — overlay token vs current `rgba(25,27,34,0.3)` |

**Spacing** (all on the 4/8/12/16/24 scale — clean):
- List inset 27 (matches `paddingHorizontal: 27` — NOT a token, literal; current code already uses 27).
- Dialog: padding 24, gap 16, actions gap 8, actions pt 12 / pb 24. All map to `spacing` xs/s/m/l (4/8/16/24) + 12 (`uacDimension12`).
- Dialog radius **16** = `borderRadius.uacPanel` (16) ✅.
- Button radius: primary **16** (`uacButtonCta`), text-button **100** (`uacRadioPill`/`round`) ✅.
- Radio/switch radius 100 ✅.

**Fonts**:
- Body/labels/values: **Poppins Regular 16/24 ls 0** = `poppinsBody` alias ✅ (exists).
- Trailing supporting text ("Mon, Tue, Wed, Thus, Fri"): **Inter Regular 12/16** = `uacBodyXsRegular` ✅.
- Big time: **Poppins Bold 32/40 ls −0.64** (main list) / **40/52 ls −0.72** (dialog) — NO existing alias at these sizes. `uacH1Bold` is Poppins-Bold 40/52 (matches dialog time). Main-list 32/40 = **NEW alias** `poppinsTimeLg` (Poppins-Bold 32/40 ls −0.64). **Q7**
- Dialog title: **Inter SemiBold 16/24** = `uacBodyMdSemibold` ✅.
- Button labels: **Poppins Medium 16/24** = `poppinsButton` ✅.
- "AM/PM" small: **Inter Regular 14/16** (main list AM) / Poppins Regular 16/24 (dialog AM/PM). `manropeCaption` is 14/20 ✗ — need Inter 14/16. **NEW alias or use uacBodyXsRegular at 14? ** **Q8**

### 1.5 Icon inventory (per-icon audit)

| Figma icon | Node | Size | Color | Exists in `src/images`? | Action |
|---|---|---|---|---|---|
| `arrow_right` (M3) | 2850:15884 etc | 24×24 | #1d1f23 | **No** (`icon_chevron_right.svg` exists, visually ✓) | REUSE `Icons.ChevronRight` at 20–24px OR export `icon_arrow_right.svg`. Current "Manage body photo" uses ChevronRight 20×20. **Recommend reuse ChevronRight.** Q9 |
| `delete` (M3 trash) | 2850:15898 | 24×24 | neutral #1d1f23 in list / red in body detail label | `icon_trash.svg` exists ✅; current code uses hand-drawn `DeleteGlyph` (3 columns) | **Use `Icons.Trash`** (replace DeleteGlyph). Confirm color: main-list delete glyph is neutral per metadata but current renders red; screenshot shows **black** trash icon next to red "Delete data" label → icon neutral, label red. **Q10** |
| `check_small` (M3 check) | 2850:15870 (hidden) | 24×24 | — | No | Only in a HIDDEN variant (selected-state list item). Radio is the actual selection UI. **Likely not needed.** Skip unless qa-ui flags. |
| `Radio buttons` (M3) | 329:1207 | 24×24 | selected #039855 / unselected outline | No (no radio svg; current code draws radioOuter/radioInner Views) | Keep View-based radio, **recolor to #039855**. No SVG export needed. |
| `arrow_drop_down` | 2850:16156 | 24×24 | — | No | Stray node OUTSIDE frames (x=696, between frames) — **decorative/leftover, ignore.** |
| Header menu/feedback | (header instance) | 24 | — | `icon_menu.svg`, `feedback.svg` ✅ | REUSE (already wired) |

**No new SVG export strictly required** if we reuse ChevronRight (arrow_right) + Trash (delete) + View-based radio. If qa-ui demands pixel-exact M3 `arrow_right`, export `icon_arrow_right.svg` (currentColor convention). **Q9/Q10 gate this.**

---

## 2. FRAME 1 — Main settings list (`2850:15840`)

**Tree**: header instance (2850:15914) + `Frame 2034` containing 4 "List Item / 0 Density" blocks:

1. **Daily Time block** (2850:15842, h=100):
   - Row: "Daily Time" label (Poppins 16/24 #1d1f23) + **Switch** (ON, green #039855), right-aligned.
   - Second sub-row (tappable → opens Change-time dialog): big time **"6:15"** (Poppins Bold 32/40, color `text/primary/bold_700` #070707) + **"AM"** (Inter Regular 14/16) on the left; **"Weekdays"** (Poppins 16/24) right-aligned.
   - Divider (#eee6df, 1px).
   - *Behavior*: Switch = `daily_notification.enabled` toggle (debounced persist, existing). The time sub-row tap → Change-time dialog (Frame 3). Currently the screen has NO tap target on the time block to open a change-time modal — **NEW interaction**.

2. **Style Direction row** (2850:15855, h=45):
   - "Style Direction" label + trailing value "Stay Balanced" (Poppins 16/24, right). Divider.
   - *Behavior*: tap → Style-direction dialog (Frame 2). Existing.

3. **Privacy control group** (2850:15873, h=213) — a section header + 3 rows under one List Item:
   - "Privacy control" (section label, Poppins 16/24 #1d1f23) — note: in current code this is `figmaTextSecondary`; Figma renders it same neutral. Divider line.
   - "Your information" + `arrow_right` (chevron) **[NEW ROW]**. Divider.
   - "Manage body photo" + `arrow_right` (chevron). Divider.
   - "Delete data" + `delete` icon (trash). Divider.
   - *Behavior*: "Your information" → **NO-OP `// TODO(settings)`** (CEO-approved, no route). "Manage body photo" → `navigation.navigate('Body')`. "Delete data" → Delete-data dialog (Frame 4).

4. **Version + Dark Mode block** (2850:15901, h=109):
   - "Version 1.0.3" row (Poppins 16/24). Divider line.
   - "Dark Mode" label + **Switch** (OFF in design) **[NEW ROW]**. Divider.
   - *Behavior*: Dark Mode = **VISUAL-ONLY local stub** (CEO-approved; no theming infra, no-op state, wire later — do NOT build dark theme). Version: render real `APP_VERSION` (currently '0.0.1'); design's "1.0.3" is mock data — **do not hardcode 1.0.3**. Flag version mismatch to PM (Q11).

**Row order (top→bottom)**: Daily Time → Style Direction → Privacy control → Your information → Manage body photo → Delete data → Version → Dark Mode.

**testIDs to add** (interactive): `settings-daily-toggle`, `settings-time-row` (opens change-time), `settings-style-direction-row`, `settings-your-information-row`, `settings-manage-body-row`, `settings-delete-data-row`, `settings-dark-mode-toggle`.

---

## 3. FRAME 2 — Style-direction dialog (overlay `2850:15977`, dialog `2850:15979`)

**Structure**: scrim covers screen; centered M3 "Basic Dialog" (366 wide, radius 16, white bg).
- **Title** "Adjust your direction" — Inter SemiBold 16/24, #1d1f23.
- **Supporting text** "This shifts your upcoming suggestions." — Poppins Regular 16/24, #1d1f23.
- **List (baseline)** — 3 M3 list items (each 72px, 2-line, trailing radio):
  - "Stay Balanced" / "Keep learning from my daily choices. No specific bias." — radio **selected** (green #039855).
  - "More Relaxed" / "Softer looks and easier layers." — radio unselected.
  - "More Polished" / "Sharper lines and structured pieces." — radio unselected.
  - Item title: Poppins Regular 16/24 #1d1f23; supporting: Inter Regular 12/16 (`uacBodyXsRegular`).
  - Dividers between items (#eee6df).
  - (A 4th "List item 3" exists hidden — ignore.)
- **Actions** (gap 8, pt12/pb24/px24): **Cancel** (text button, radius 100, Poppins Medium 16/24, label #1d1f23) + **Update** (primary, bg #121212, radius 16, white Poppins Medium label). Each 155px / flex.

**Note**: current code has a circular monogram "Badge" (S/R/P initials, `#EADDFE`/`#4F378A`) on the left of each option — **Figma has NO badge**; radios only. The redesign **drops the monogram badge**. (Drift — current decorative element not in Figma.)

*Behavior* (preserve existing): tapping a row sets pending direction; "Update" → `persistUserMetadata({ style_direction })`; "Cancel"/scrim → close. Copy: "Update Focus" → **"Update"**.

**testIDs**: `settings-direction-option-stay_balanced` / `-more_relaxed` / `-more_polished`, `settings-direction-cancel`, `settings-direction-update`.

---

## 4. FRAME 3 — Change-time dialog (NEW) (overlay `2850:16056`, dialog `2850:16058`)

**This is the only fully NEW dialog. BUILD FOR REAL.**

**Structure** (Basic Dialog, 366 wide, radius 16):
- **Title** "Daily Time" — Inter SemiBold 16/24 #1d1f23.
- **Time + AM/PM row** (`Frame 2069`):
  - Big **"07 : 30"** — Poppins **Bold 40/52** ls −0.72 (`uacH1Bold` matches), #1d1f23, left.
  - Right stack (`Frame 2070`, gap 4): two "Trailing element" rows:
    - "AM" (Poppins Regular 16/24) + radio (selected green #039855).
    - "PM" (Poppins Regular 16/24) + radio (unselected).
- **List (baseline)** — 2 M3 list items (72px each), frequency choice:
  - "Weekdays" / supporting "Mon, Tue, Wed, Thus, Fri" (Inter 12/16) + radio **selected** green.
  - "Everydays" (single line, no supporting) + radio unselected.
  - Dividers #eee6df.
- **Actions**: **Cancel** (text, radius 100) + **Update** (primary #121212, radius 16). Same as Frame 2.

*Behavior* (**CEO: build real, mirror enabled-toggle persist path**):
- Persist via `updateCurrentUser({ user_metadata: { daily_notification: {...} } })` (same `persistUserMetadata` helper).
- **Metadata shape** (from `src/types/auth.ts`):
  ```ts
  daily_notification: {
    enabled?: boolean;
    time?: string;          // "HH:MM" e.g. "07:30"
    period?: 'AM' | 'PM';   // DailyNotificationPeriod
    frequency?: 'weekdays' | 'everydays';  // DailyNotificationFrequency
  }
  ```
- AM/PM radios → `period`. Weekdays/Everydays radios → `frequency`. Time "07:30" → `time`.
- **Open question Q12**: time value editing UX. Figma shows static "07 : 30" — is the time itself editable in this dialog (picker/stepper), or only AM-PM + frequency are editable here? Metadata has `time: string` but the dialog shows no stepper/keypad affordance. Default assumption: **time display is read-only in this MVP; only period + frequency are wired** (matches the radios present). Confirm with CEO.
- Note: "Everydays" label in design = `frequency: 'everydays'`; current `frequencyLabelMap` renders 'everydays' → "Every day". Align label to **"Everydays"** to match design, or keep map. Q13.

**testIDs**: `settings-time-period-am`, `settings-time-period-pm`, `settings-time-freq-weekdays`, `settings-time-freq-everydays`, `settings-time-cancel`, `settings-time-update`.

---

## 5. FRAME 4 — Delete-data dialog (overlay `2850:16144`, dialog `2850:16146`)

**Structure** (Basic Dialog, 366 wide, radius 16, white):
- **Title** "Delete Data" — Inter SemiBold **16/20** (line-height 20, not 24) #1d1f23.
- **Supporting Text** "Auxi will revert to day one. This cannot be undone." — Poppins Regular 16/24 #1d1f23 (wraps 2 lines).
- **Actions**: **Cancel** (text button, radius 100, Poppins Medium, #1d1f23) + **Delete** (primary, bg **#bb251a** `background/danger/bold_100`, radius 16, white Poppins Medium label).

*Behavior* (preserve existing): "Delete" → `resetUserPreferences()`; Cancel/scrim → close. Copy: primary label "Reset preferences" → **"Delete"**. Color: replace hardcoded `#D34F3E` with token #bb251a (`figmaDestructive`).

**testIDs**: `settings-delete-cancel`, `settings-delete-confirm`.

---

## 6. FRAME 5 — Body-photo detail screen (`2850:16157`)

**Structure**: full-bleed image + header + detail panel.
- **Image 3:4** (`2850:16158`) — 414 × 552, top, full-width body photo (3:4 crop).
- **Header** instance (`2850:16159`) overlaid on image, 414×107 — back chevron left (screenshot shows a back "‹" button top-left in a rounded surface). Title/action minimal.
- **detail** panel (`2850:16160`, y=512, 414×384) — bg `background/primary/subtle_200` **#eee6df**:
  - **Text block** (Poppins Regular 16/24 #1d1f23, paragraph spacing 12):
    - "Time: 12:23 - 12 Feb, 2026"
    - "This photo helps show how outfits look on you"
    - "🔒 Your photo stays private."
  - **Actions row** (`2850:16162`, 374 wide, 56 tall) — two M3 Secondary (text) buttons, space-between:
    - **Delete** (LEFT) — Poppins Regular 16/24, color `red` **#cc4c3e** (`figmaRed`), px24/py16, radius 100 state-layer.
    - **Retake** (RIGHT) — Poppins Regular 16/24, color #1d1f23 (neutral), px24/py16.

**Redesign vs existing `BodyScreen.tsx`**:
- Current `BodyScreen` is a **multi-photo manager** (3-up grid, upload, try-on mode, long-press to delete via `Alert`, large-image modal). It is reached from Settings "Manage body photo" → `navigation.navigate('Body')`.
- Frame 5 is a **single-photo detail view** (one large 3:4 image + metadata + Delete/Retake). This does NOT exist as a screen today.
- **This is a NEW screen OR a new mode/route of Body** — Figma names it "body photo" (detail). It likely sits *between* the manager grid and actions: tap a photo → this detail. Current grid tap opens a `largeImageModal` (image only, no metadata/actions).
- **Behaviors**:
  - **Delete** → delete this body photo (maps to existing `bodyService.deleteBody(id)` + confirm). Currently delete is long-press + Alert; redesign makes it an explicit button.
  - **Retake** → re-capture/replace the photo (maps to `launchCamera`/`launchImageLibrary` + `bodyService.uploadBody`). No explicit "replace one" path today (current upload always adds).
  - **Time/date** "12:23 - 12 Feb, 2026" → `BodyItem.created_at?` (`bodyService.ts:31`, optional). Field exists — format client-side; no new BE field (Q14 resolved).

**Routing OPEN QUESTION (Q15)**: Is this (a) a new route `BodyPhotoDetail` (register in `navigation.ts` + `AppNavigator.tsx`, params: bodyId/imageUrl/createdAt), (b) a new `mode` param on existing `Body` route, or (c) a redesign of the `largeImageModal` inside `BodyScreen`? **Flagged — needs CEO/tech-lead decision before implementation.** Task says "document whether redesign or new screen; flag routing as open question if unclear" → **UNCLEAR, flagged.**

**testIDs**: `body-detail-back`, `body-detail-delete`, `body-detail-retake`.

**New BE fields**: none. "Time:" line uses existing `BodyItem.created_at` (optional).

---

## 7. Open questions / escalations

- **Q1 (copy)**: Header title — Figma "Setting" (singular) vs current "Settings". Keep "Settings"? (low risk; assume keep.)
- **Q2 (token)**: Switch OFF track color — not bound to a Figma var. Use a neutral grey token (e.g. `figmaDivider`/M3 outline #e4e7ec)? Confirm value.
- **Q3 (token)**: Primary button bg #121212 (`background/neutral/bold_400`) vs existing `figmaAction` #272A32. Add `figmaButtonDark` #121212 or accept #272A32? (Design = #121212.)
- **Q4 (token)**: List divider — Figma #eee6df (`border/primary/subtle_300`) vs current `figmaDivider` #D1D3D8. Add `figmaListDivider` #eee6df. Lighter dividers across the whole screen is a visible change — confirm intentional.
- **Q5 (token semantics)**: `background/primary/subtle_200` = #eee6df (body detail bg) collides in value with the divider token but differs semantically. Name as surface token (e.g. `figmaDetailSurface` #eee6df) distinct from divider.
- **Q6 (scrim)**: Dialog scrim — `background/overlay/dark/10` = rgba(130,113,55,0.1) is very light; screenshots show a dark ~30% scrim. Current code uses `rgba(25,27,34,0.3)`. The Rectangle 346 (`2850:16145` etc.) is the actual scrim fill — value not surfaced in var defs. **Confirm scrim color/opacity** (likely keep current dark 30%; the #82713 1a token seems to be a different layer).
- **Q7 (font alias)**: Main-list big time = Poppins Bold **32/40** ls −0.64 — no alias. Add `poppinsTimeLg`. (Dialog time 40/52 = existing `uacH1Bold`.)
- **Q8 (font alias)**: "AM" in main list = Inter Regular **14/16**. No exact alias (`uacBodyXsRegular` is 12/16, `manropeCaption` 14/20). Add alias or accept nearest. Dialog AM/PM = Poppins 16/24 (`poppinsBody`).
- **Q9 (icon)**: `arrow_right` (M3 24px) — reuse `Icons.ChevronRight` (visually a chevron) or export pixel-exact `icon_arrow_right.svg`? Recommend reuse ChevronRight.
- **Q10 (icon/color)**: `delete` trash icon — reuse `Icons.Trash` (replaces hand-drawn DeleteGlyph). Confirm main-list trash icon color: metadata = neutral #1d1f23, screenshot = black icon + red "Delete data" label. So **label red, icon neutral** (differs from current all-red glyph). Confirm.
- **Q11 (version)**: Design shows "Version 1.0.3"; code `APP_VERSION = '0.0.1'`. Render real version, not mock. PM to confirm true current version string.
- **Q12 (change-time UX)**: Is the time value ("07:30") editable in the dialog (picker), or only AM/PM + frequency radios? Figma shows static time, no stepper/keypad. Assumed read-only time for MVP — **confirm**, this determines whether `time` is actually wired.
- **Q13 (copy)**: "Everydays" (design) vs current `frequencyLabelMap` "Every day". Align to "Everydays"?
- **Q14 (BE field) — RESOLVED**: Body-photo detail "Time: 12:23 - 12 Feb, 2026" maps to `BodyItem.created_at?: string` (`bodyService.ts:31`) — field EXISTS (optional). No new BE field needed; format `created_at` client-side ("HH:MM - DD MMM, YYYY") and gracefully omit/placeholder the line if absent.
- **Q15 (ROUTING — blocking)**: Body-photo detail (Frame 5) — new route `BodyPhotoDetail`, new `mode` on `Body`, or redesign of existing `largeImageModal`? Needs CEO/tech-lead decision before code. Also "Manage body photo" currently → `Body` (grid manager); confirm the grid manager stays and detail is reached by tapping a photo.
- **General**: Style-direction dialog drops the monogram badge present in current code (Figma has radios only) — confirm removal is intended.
- **Scope note**: This artifact covers extraction only. `figma-theme-sync` (Q2–Q7 token diffs) and possibly `figma-icons-sync` (Q9/Q10 if exact SVGs wanted) should run before/at implementation. Frame 5 is BLOCKED on Q15 routing.

---

## 8. Screenshots (reference, downloaded to /tmp during extraction — short-lived URLs)
- Main list: node 2850:15840
- Style-direction dialog: 2850:15977
- Change-time dialog: 2850:16056
- Delete-data dialog: 2850:16144
- Body-photo detail: 2850:16157
