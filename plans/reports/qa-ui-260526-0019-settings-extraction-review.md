# qa-ui — Review-Extraction Audit: Settings Redesign (5 frames)

- **Mode**: Review-extraction (Pass 1 ONLY — pre-code gate, no sim, no code-vs-design)
- **Artifact audited**: `auxi/plans/260526-0019-settings-redesign/figma-extraction-settings.md`
- **Figma ground truth**: file `0nXXMAR4Arf1ZfjtQvtBh0`, section `2850:15839`
- **Date**: 2026-05-26
- **Reference screenshots saved**: `auxi/docs/qa-findings/screenshots/2026-05-26/figma-settings-frame1-main.png`, `figma-settings-frame5-bodyphoto.png`

## VERDICT: PASS (with 2 minor corrections + 2 BLOCKS-IMPL escalations)

The artifact is a faithful, complete extraction. Frame trees match `get_metadata` exactly; every token claim is confirmed against `get_variable_defs` and cross-checked against `theme.ts`; icon and font enumerations are accurate. Two minor inaccuracies (non-blocking) and two genuinely-blocking open questions (Q12, Q15) are itemized below. mobile-dev may proceed to `figma-to-rn-workflow` Phase 1 **for Frames 1–4** once the CEO decides Q12. **Frame 5 stays BLOCKED on Q15** (routing) — do not code Frame 5 until resolved.

---

## 1. Token / color verification (all confirmed vs Figma var-defs)

| Artifact claim | Figma var | Figma value | Confirmed | theme.ts status |
|---|---|---|---|---|
| Success green (toggle/radio ON) | `fixed/success/base`, `icon/success/base` | `#039855` | ✅ | NO token → **NEW** (correct) |
| Primary button bg (Update) | `background/neutral/bold_400` | `#121212` | ✅ | NO token (`figmaAction`=#272A32) → **NEW** (correct) |
| Divider | `border/primary/subtle_300` | `#eee6df` | ✅ | `figmaCaptionPillBg`=#eee6df (semantic mismatch), current `figmaDivider`=#D1D3D8 = drift → **NEW semantic** (correct) |
| Destructive (Delete button) | `background/danger/bold_100` | `#bb251a` | ✅ | `figmaDestructive`/`uacTextDangerBase`=#bb251a → **REUSE** (correct) |
| Body text | `text/neutral/base` | `#1d1f23` | ✅ | `uacTextBase`=#1d1f23 EXISTS; screen uses `figmaText`#272A32 = drift → **REUSE uacTextBase** (correct) |
| Header title color | `text/primary/bold_700` | `#070707` | ✅ | `figmaTextDark`=#070707 → REUSE (correct) |
| Body-detail Delete label | `red` | `#cc4c3e` | ✅ | `figmaRed`=#CC4C3E → REUSE (correct, case-insensitive) |
| Body-detail panel bg | `background/primary/subtle_200` | `#eee6df` | ✅ | (see correction C2 below) |
| Dialog scrim layer | `background/overlay/dark/10` | `#8271371a` | ✅ | (see Q6 triage) |
| Font family switch Archivo→Poppins | `font-family/body` | `Poppins` | ✅ | `poppinsBody` EXISTS → REUSE (correct) |

**Token-drift list is correct.** The three MISSING tokens (#039855 success, #121212 button-dark, semantic #eee6df list-divider) are accurately flagged as needing additions; all REUSE tokens confirmed present in `theme.ts`.

## 2. Frame trees (get_metadata cross-check)

- **Frame 1 (`2850:15840`)**: 4 List Items at documented node IDs and heights (100 / 45 / 213 / 109) — exact match. Header instance `2850:15914` confirmed. NEW rows "Your information" (`2850:15889` + `arrow_right` `2850:15891`) and "Dark Mode" (`2850:15911` + visible Switch `2850:15912`) present. Row order verified against screenshot: Daily Time → Style Direction → Privacy control → Your information → Manage body photo → Delete data → Version 1.0.3 → Dark Mode. ✅
- **Frame 2 (`2850:15979`)**: Basic Dialog, 3 visible list items + 1 hidden (`2850:15987` `List item 3` hidden) + 2 action buttons — matches "(4th hidden — ignore)" claim. ✅
- **Frame 3 (`2850:16058`)**: see §3 (Q12). ✅
- **Frame 4 (`2850:16146`)**: Title `2850:16148` h=20 — confirms artifact's **16/20** line-height nuance (var `Text-md (l-20)/Semibold`, distinct from other dialogs' 16/24). Good catch. ✅
- **Frame 5 (`2850:16157`)**: Image 3:4 (414×552), header overlay, detail panel y=512 h=384, two Secondary text buttons (Delete `2850:16175` left / Retake `2850:16179` right). ✅

## 3. Frame 3 change-time — Q12 (time editability) — DECISIVE

Metadata is conclusive: node `2850:16062` "07 : 30" is a **single `text` node**, NOT a frame containing a stepper / keypad / picker / segmented control. The only interactive descendants in the dialog are `Radio buttons` instances (AM/PM `2850:16067`,`2850:16071`; Weekdays/Everydays in `List (baseline)` `2850:16072`). **There is no time-edit affordance in the frame.** The artifact's Q12 default assumption (time displayed read-only; only `period` + `frequency` wired in this MVP) is the literally-correct reading of what Figma shows. → **This is a product decision, not a fidelity gap** — escalated (BLOCKS-IMPL) because it gates whether `daily_notification.time` persistence is implemented.

## 4. Frame 5 body-photo — Q15 (routing) — NO Figma signal

The frame is a standalone "body photo" detail (1598,291 on canvas, off to the side of the main flow). `get_metadata` surfaces NO prototype/interaction link indicating how it is reached. There is no Figma signal to disambiguate new-route vs new-mode vs largeImageModal-redesign. The artifact correctly flagged this as UNCLEAR/blocking. → **BLOCKS-IMPL** (needs CEO/tech-lead). Frame 5 cannot be coded faithfully without this decision.

## 5. Icon inventory — plausible

- `arrow_right` `2850:15884/15891`, `delete` `2850:15898`, `check_small` `2850:15870` (hidden), `Radio buttons` `2850:16067` etc. — all match metadata node IDs and 24×24 sizing. Existence claims (ChevronRight/Trash exist; no radio SVG; check_small only in hidden variant) are plausible and correctly reasoned. "No new SVG strictly required" is a sound default; Q9/Q10 correctly gate pixel-exact M3 export.

---

## MINOR CORRECTIONS (non-blocking — fold into impl, no re-extract needed)

- **C1 — Header right icon.** Artifact §1.1/§2 describes header as "menu + title + right icon (feedback)". The Frame-1 Figma render shows **only** hamburger-menu-left + centered "Setting" title — no right-side icon visible. Non-material: artifact already declares header out-of-scope and preserves current code's header. Just don't add a phantom right icon based on the note.
- **C2 — "Delete data" label color (Q10).** Artifact claims main-list row = "label red, icon neutral." Figma render shows the **label rendered dark/neutral** (not red) alongside a neutral trash icon — i.e. the whole main-list row is neutral. Red destructive appears only in (a) Delete-data **dialog button** #bb251a and (b) Frame-5 **Delete text button** #cc4c3e. Correction makes impl simpler (main-list "Delete data" row = neutral text + neutral trash). The icon-neutral half of the claim was right.
- **C2b — Q5 reuse opportunity (informational).** Body-detail panel bg #eee6df (`background/primary/subtle_200`) already has a value-matching token in `theme.ts`: `figmaFooterActivePill: '#eee6df' // background/primary/subtle_200`. Artifact didn't surface it. A new semantically-named token is still cleaner, but note the existing one before adding a duplicate value.

---

## Open-question triage (all ~15)

**BLOCKS-IMPL (needs CEO / tech-lead before coding the affected surface):**
- **Q12 — change-time editability.** Time value read-only vs editable picker. Gates whether `daily_notification.time` is wired. Figma shows read-only. → CEO confirm: MVP = period + frequency only (recommended), or add a time picker?
- **Q15 — Frame 5 routing.** New route `BodyPhotoDetail` vs new `mode` param on `Body` vs redesign of `largeImageModal`. No Figma signal. → CEO/tech-lead decision. Frame 5 is BLOCKED until then.

**SAFE-ASSUMPTION (recommend proceeding; flag to PM but do not block):**
- **Q1** Header "Setting" vs "Settings" → keep "Settings" (header out of scope). SAFE.
- **Q2** Switch OFF track color (no bound var) → use neutral grey; `background/neutral/subtle_200` `#e4e7ec` IS present in Frame-1 var-defs as a candidate. Recommend `#e4e7ec`. SAFE.
- **Q3** Primary button #121212 → add `figmaButtonDark`. Design value is explicit. SAFE (route through `figma-theme-sync`).
- **Q4** List divider #eee6df → add `figmaListDivider`. Lighter dividers are intentional per design. SAFE (flag visible change to PM).
- **Q5** Body-detail surface #eee6df → distinct semantic token; reuse value (see C2b). SAFE.
- **Q6** Dialog scrim. `background/overlay/dark/10`=#8271371a is a warm 10% layer, not the visible ~30% dark scrim. Keep current `rgba(25,27,34,0.3)`. SAFE.
- **Q7** Main-list big time Poppins Bold 32/40 ls −0.64 (`heading/H2` confirmed) → add `poppinsTimeLg`. Dialog time 40/52 = `uacH1Bold` (confirmed). SAFE.
- **Q8** Main-list "AM" Inter Regular 14/16 (`body/sm` confirmed) → add alias or accept nearest. SAFE.
- **Q9** `arrow_right` → reuse `Icons.ChevronRight`. SAFE.
- **Q10** trash icon → reuse `Icons.Trash`; main-list row neutral (see C2). SAFE.
- **Q11** Version: render real `APP_VERSION`, not mock "1.0.3". SAFE (PM confirm true version).
- **Q13** "Everydays" vs map "Every day" → align label to design "Everydays". SAFE (copy).
- **Q14** RESOLVED in artifact — `BodyItem.created_at` exists; no new BE field. Confirmed accurate.
- **Monogram badge removal** (Style-direction dialog) → Figma has radios only, no badge. Drop it. SAFE.

---

## Status
- **Status:** DONE
- **Verdict:** PASS — extraction is faithful and complete enough to implement Frames 1–4 (given Q12 decision); Frame 5 BLOCKED on Q15.
- **Concerns:** 2 minor non-blocking corrections (C1 header right-icon, C2 Delete-data label color). No re-extract required.
- **BLOCKS-IMPL for CEO:** Q12 (change-time: time read-only vs editable picker — gates `time` persistence) · Q15 (Frame-5 routing: new route / mode param / largeImageModal redesign).
