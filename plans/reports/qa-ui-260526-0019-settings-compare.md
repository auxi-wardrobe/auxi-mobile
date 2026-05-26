# qa-ui — Compare Mode: Settings Redesign (5 frames)

- **Mode**: Compare (Pass 2 thorough code-vs-Figma + Pass 3 best-effort sim)
- **Figma ground truth**: file `0nXXMAR4Arf1ZfjtQvtBh0` — frames 2850:15840 (main, +header 2850:15914), 2850:15979 (style), 2850:16058 (time), 2850:16146 (delete), 2850:16157 (body-photo)
- **Contract**: `plans/260526-0019-settings-redesign/figma-extraction-settings.md`
- **Prior review (corrections C1/C2)**: `plans/reports/qa-ui-260526-0019-settings-extraction-review.md`
- **Code audited**: `SettingsScreen.tsx`, `BodyScreen.tsx` (photoDetail), `navigation.ts`, `theme.ts`, `icon_arrow_right.svg`, `icon_delete.svg`, `icons/index.ts`, `FigmaPrimitives.tsx`
- **Date**: 2026-05-26 · Branch: `feat/au-253-home-grid-view`
- **Figma ref screenshots**: `docs/qa-findings/screenshots/2026-05-26/figma-f1-main.png` … `figma-f5-bodyphoto.png`
- **Sim evidence**: `docs/qa-findings/screenshots/2026-05-26/qa-ui-sim-blocked-rnlocalize-redbox.png`

---

## VERDICT SUMMARY

| Frame | Pass 2 (code vs Figma) | Pass 3 (sim) | Net |
|---|---|---|---|
| 1 — Main settings list | **PASS** (1 LOW note) | SIM_BLOCKED | **PASS (Pass 2)** |
| 2 — Style-direction dialog | **PASS** | SIM_BLOCKED | **PASS (Pass 2)** |
| 3 — Change-time dialog | **PASS** | SIM_BLOCKED | **PASS (Pass 2)** |
| 4 — Delete-data dialog | **PASS** | SIM_BLOCKED | **PASS (Pass 2)** |
| 5 — Body photoDetail | **PASS** (1 LOW note) | SIM_BLOCKED | **PASS (Pass 2)** |

**Overall: PASS on Pass 2 for all 5 frames. Pass 3 SIM_BLOCKED** (native-module redbox, not a fidelity issue — see §Pass 3). No HIGH or MEDIUM findings. Two LOW observations below; neither blocks merge.

Token-lint on the redesign files is clean: every fill/stroke/font in the new Settings + Frame-5 code resolves to a `theme.ts` token. (The 73 repo-wide violations the script reports are all pre-existing — incl. 4 in BodyScreen's *legacy* multi-photo manager styles at lines 602/629/669/676, untouched by this change.)

---

## PASS 2 — Code vs Figma (thorough, all 5 frames)

### Frame 1 — Main settings list (`2850:15840`) — PASS

Verified against `figma-f1-main.png` + `get_variable_defs`:
- **Header**: hamburger-menu left + centered "Settings" only — **no right feedback icon** (C1 honored; code §358-369 has a `headerSpacer` placeholder, not an icon). Title uses `uacBodyMdSemibold` (Inter SemiBold 16/24) `figmaTextDark` #070707 — matches header var `text/primary/bold_700`. ✓ (Copy "Settings" vs Figma "Setting" — Q1 safe-assumption, kept "Settings".)
- **8 rows, correct order**: Daily Time (+ time sub-row) → Style Direction → Privacy control (section label) → Your information → Manage body photo → Delete data → Version → Dark Mode. Matches Figma exactly. ✓
- **"Your information"** present, chevron trailing, `onPress={() => {}}` no-op (CEO-approved). ✓
- **"Dark Mode"** present, visual-only `darkModeStub` Switch, OFF in design. ✓
- **"Delete data" row = NEUTRAL** (C2 honored): label `uacTextBase` #1d1f23 + neutral trash icon `color={uacTextBase}`. Figma render confirms dark label + dark trash. ✓ Red appears only in the delete *dialog button* and Frame-5 Delete text button.
- **Green Switch ON** = `figmaToggleOn` #039855 (`fixed/success/base`), OFF track `figmaToggleOffTrack` #e4e7ec (`background/neutral/subtle_200`, Q2 resolved), white thumb. ✓
- **Body font Poppins**: rows use `poppinsBody` (Poppins-Regular 16/24 ls 0) — matches `Text-md (l-24)/Regular` / `font-family/body = Poppins`. Big time `poppinsTimeLg` (Poppins-Bold 32/40 ls −0.64) = `heading/H2`. "AM" period `poppinsBodySm` (Poppins-Regular 14/16) = `body/sm`. ✓
- **Dividers** `figmaListDivider` #eee6df (`border/primary/subtle_300`). ✓
- **List inset** `paddingHorizontal: 27` matches Figma x=27/width=360. ✓
- **testIDs** present on all interactive elements: `settings-menu-button`, `-daily-toggle`, `-time-row`, `-style-direction-row`, `-your-information-row`, `-manage-body-row`, `-delete-data-row`, `-dark-mode-toggle`. ✓
- No raw hex. ✓

**LOW-1 (icon geometry — non-blocking):** Figma's trailing affordance on "Your information" / "Manage body photo" renders as a small **solid right-pointing triangle (▶)** (M3 `arrow_right` filled caret). The new `icon_arrow_right.svg` is a **thin stroked chevron** (`M9 6L15 12L9 18`, 1.5 stroke, currentColor). Visually a chevron, not a filled triangle. This is the artifact-sanctioned reuse decision (Q9: "reuse a chevron-style arrow_right"; the prior extraction review marked it SAFE). Geometry differs slightly from the Figma caret but reads identically as "navigates forward." Flag to designer only if a filled-triangle caret is required; otherwise accept.

### Frame 2 — Style-direction dialog (`2850:15979`) — PASS

Verified against `figma-f2-style.png`:
- Title "Adjust your direction" = `uacBodyMdSemibold` (Inter SemiBold 16/24) #1d1f23. ✓
- Supporting "This shifts your upcoming suggestions." = `poppinsBody` #1d1f23. ✓
- 3 options (Stay Balanced / More Relaxed / More Polished) with title `poppinsBody` + description `uacBodyXsRegular` (Inter 12/16). ✓
- **Monogram badge DROPPED** — no S/R/P circular badge in code; radios only. Matches Figma (no badge). ✓
- **Green radios** — `radioOuterActive` borderColor + `radioInner` bg = `figmaToggleOn` #039855; selected = "Stay Balanced". ✓
- Dividers `figmaListDivider` #eee6df between options. ✓
- **Actions**: Cancel (text button, radius 100 `uacRadioPill`, `poppinsButton` label #1d1f23) + **"Update"** (NOT "Update Focus"; primary bg `figmaButtonDark` #121212, radius 16, white label). ✓
- testIDs `settings-direction-option-*`, `-cancel`, `-update`. ✓

### Frame 3 — Change-time dialog (`2850:16058`) — PASS

Verified against `figma-f3-time.png`:
- Title "Daily Time" = `uacBodyMdSemibold` #1d1f23. ✓
- **"07 : 30" READ-ONLY** — rendered via `settings.dailyNotification.time.replace(':', ' : ')`, no stepper/picker/keypad (CEO Q12 = read-only confirmed). Font `uacH1Bold` (Poppins-Bold 40/52). ✓
- **AM/PM radios** (period) green, selected AM. **Weekdays/Everydays radios** (frequency) green, selected Weekdays with supporting "Mon, Tue, Wed, Thus, Fri" (`uacBodyXsRegular`). ✓
- **Period + frequency are the ONLY editable controls** — `applyChangeTime` persists `{ period, frequency }` only; `time` not written (matches read-only display). ✓
- Actions Cancel + "Update" (#121212). testIDs `settings-time-period-am/pm`, `-freq-weekdays/everydays`, `-cancel`, `-update`. ✓
- "Everydays" label aligned to design (Q13). ✓

### Frame 4 — Delete-data dialog (`2850:16146`) — PASS

Verified against `figma-f4-delete.png` + var-defs:
- Title "Delete Data" = `interSemiboldSm` (**Inter SemiBold 16/20**, line-height 20 not 24) — matches Figma var `Text-md (l-20)/Semibold`. Correct nuance captured. ✓
- Supporting "Auxi will revert to day one. This cannot be undone." = `poppinsBody` #1d1f23, wraps 2 lines. ✓
- **Actions**: Cancel (text, radius 100) + **"Delete"** (destructive, bg `figmaDestructive` **#bb251a** = `background/danger/bold_100`, radius 16, white label). ✓
- testIDs `settings-delete-cancel`, `-confirm`. ✓

### Frame 5 — Body photoDetail (`2850:16157`) — PASS

Verified against `figma-f5-bodyphoto.png` + var-defs:
- **`photoDetail` mode** added to `Body` route union in `navigation.ts` (`'manage' | 'tryOn' | 'photoDetail'`), reached via `navigation.navigate('Body', { mode: 'photoDetail' })` from Settings "Manage body photo". (Q15 routing resolved = new mode param on Body.) ✓
- **Full 3:4 image** top — `detailImageWrap` height = `screenWidth * 4/3`, `resizeMode="cover"`. ✓
- **Back chevron** top-left in rounded surface — `TopIconButton` + `Icons.ChevronLeft`, `detailBackWrap` top:8 left:22. Matches Figma's rounded back button overlay. ✓
- **Cream panel** `detailPanel` bg `figmaDetailSurface` #eee6df (`background/primary/subtle_200`). ✓
- **Caption** (`detailCopy` gap 12 = `body/md` paragraph-spacing 12): "Time: {HH:MM - DD MMM, YYYY}" from `created_at` (gracefully omitted if absent) / "This photo helps show how outfits look on you" / "🔒 Your photo stays private." All `poppinsBody` #1d1f23. ✓
- **Actions**: **Delete (LEFT, red `figmaRed` #cc4c3e** = Figma `red`) + **Retake (RIGHT, neutral #1d1f23)**, space-between, px24/py16, radius 100. ✓
- testIDs `body-detail-back`, `-delete`, `-retake` (+ retake modal `-camera/-gallery/-cancel`). ✓
- **Accepted BE gap (NOT a fidelity fail):** Retake = re-capture + `uploadBody` (adds a new photo, no replace endpoint). Per task instruction this is an accepted backend gap, not a fidelity issue. Detail view renders faithfully. ✓

**LOW-2 (non-blocking):** `detailContainer` bg is `figmaDetailSurface` #eee6df for the whole screen, including behind the image. Figma's image area sits on `background/primary/subtle_50` #f2efec, but it's fully covered by the 3:4 image (`resizeMode="cover"`), so the #eee6df is never visible there. Only matters in the empty-state placeholder (no photo), which uses `figmaCardSurface` anyway. Cosmetic, invisible in the happy path. No action needed.

---

## PASS 3 — Sim (best-effort) — SIM_BLOCKED

- **MCP pre-flight PASSED**: `mcp-doctor.sh` → sim booted (iPhone 16, iOS 18.2), WDA up on :8100, mobile-mcp 0.0.56 pinned. Stack healthy.
- **Blocker**: First `take_screenshot` shows a fatal RN redbox: `TurboModuleRegistry.getEnforcing(...): 'RNLocalize' could not be found. Verify that a module by this name is registered in the native binary.` The app cannot mount any JS screen — call stack is in `detectDeviceLanguage` at app init, before navigation.
- One lightweight Dismiss tap attempted; redbox persists (it's a native-binary/JS mismatch, not a recoverable fast-refresh error). Recovering it requires a native rebuild — explicitly out of scope per task ("NO BUILD CHURN, do not fight Xcode, mark SIM_BLOCKED within 1-2 attempts").
- **This is NOT a Settings-redesign fidelity issue** — it's an installed-binary / Metro state problem affecting the entire app at launch (RNLocalize native module out of sync with the JS bundle). Evidence: `qa-ui-sim-blocked-rnlocalize-redbox.png`.
- **Recommendation**: a clean `yarn ios:sim` rebuild (mobile-dev / qa-mobile) to re-link RNLocalize, then re-run Pass 3. Until then Pass 2 stands as the visual verdict.

---

## ROUTING

- **No HIGH/MEDIUM findings** → nothing blocking to route to mobile-dev.
- **LOW-1** (arrow_right = stroked chevron vs Figma filled triangle caret): optional designer call. Route to mobile-dev ONLY if CEO wants the exact M3 filled caret — then `figma-icons-sync` to export the filled `arrow_right`. Otherwise accept (artifact-sanctioned reuse).
- **Pass 3 re-run**: hand to qa-mobile/mobile-dev to rebuild the sim (fix RNLocalize redbox), then qa-ui re-runs Pass 3 on the 5 surfaces.
- **Pre-existing token debt** (4 BodyScreen legacy-manager hex literals + repo-wide 73): outside this audit's scope; flag to mobile-dev as separate cleanup if desired.

---

## Status
- **Status:** DONE_WITH_CONCERNS
- **Summary:** Pass 2 PASS on all 5 frames (tokens, typography, copy, icons, testIDs, C1/C2 corrections all confirmed against Figma var-defs + reference screenshots). Pass 3 SIM_BLOCKED by an app-wide RNLocalize native-module redbox — not a redesign fidelity issue.
- **Concerns:** Sim could not be visually verified (native binary out of sync, no-rebuild constraint). 2 LOW non-blocking notes (chevron vs filled-caret geometry; invisible detailContainer bg).
- **Report:** `auxi/plans/reports/qa-ui-260526-0019-settings-compare.md`
