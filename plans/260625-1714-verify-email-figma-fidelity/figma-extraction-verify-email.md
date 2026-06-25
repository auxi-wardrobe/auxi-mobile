# Figma Extraction — VerifyEmail ("verifie")

- **Figma**: https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=3910-23056
- **Frame**: `3910:23056` name `verifie` · 390×844
- **Target screen**: `src/screens/auth/VerifyEmailScreen.tsx`
- **Why**: CEO flagged the shipped "verified"/verify screen as wrong vs Figma.
- **Date**: 2026-06-25

## Frame tree (get_metadata)

```
verifie 3910:23056 (390×844)
├─ Frame 2108 3910:23062  x31 y546  327×160   ← bottom action stack
│  └─ Frame 2109 3910:23063  327×160 (gap 12, column)
│     ├─ Button 3910:23136  327×56   "Open Mail app"        (Primary/Enable/56)
│     ├─ Button 3910:23140  327×56   "Resend email in(00s)" (Secondary/Disable/56)
│     └─ Frame 2119 3910:23144  327×24  (row, gap 12, center)
│        ├─ Supporting Text 3910:23145  "Waiting for verification…"
│        └─ streamline-ultimate:loading 3910:23146  24×24  (spinner)
├─ Frame 2203 3910:23073  x15 y171  360×258  (column, gap 7, center)  ← hero block
│  ├─ macgie-animate-2 3910:23074  103×126   (brand mascot logo)
│  ├─ Frame 2131 3910:23075 → "Verify your email"  (H4 SemiBold 24/32)
│  ├─ Supporting Text 3910:23126  "We sent a verification email to"  (body md regular)
│  ├─ Supporting Text 3910:23128  "Youremai@abc.com"                 (body md SEMIBOLD)
│  └─ Supporting Text 3910:23130  "Click the link in the email to verify account." (body md regular)
└─ Button 3910:23149  x296.5 y23  73×44  "Logout"  (Text button/Enable/44, top-right)
```

## Tokens (get_variable_defs)

| Figma var | Value | theme.ts / m-tokens equivalent |
|---|---|---|
| background/primary/neutral_50 | #fcfcfd | `uacBackgroundNeutralSubtlest` (screen bg) — MATCHES current |
| background/neutral/base | #1d1f23 | `role.ink` / `figmaPrimaryButtonBg` (primary CTA fill) |
| text/primary/base | #f2efec | `role.primaryBtnLabel` (#EFE9E3 ≈) / `figmaPrimaryButtonText` (primary label) |
| text/neutral/base | #1d1f23 | `uacTextBase` (heading + body + secondary label) |
| border/neutral/base | #1d1f23 | `role.ink` / `uacBorderBase` (secondary btn 1.5px border) |
| text/neutral/subtle_200 | #7a7f89 | `uacTextSubtle200` (status "Waiting…" text) |
| heading/H4 | Poppins SemiBold 24/32, ls 0 | `uacH4Bold` (title) / `type.h2`-ish |
| body/md | Poppins 16/24, ls 0 | `uacBodyMdRegular` / `uacBodyMdMedium` / `uacBodyMdSemibold` |
| body/xs | Poppins Medium 12/16 | `uacBodyXsMedium` (Logout label) |
| dimension/16 | 16 | `uacDimension16` |
| Button primary | h56 r16 px(implied) | `MButton variant="primary" size="lg"` (h56 r16) |
| Button secondary/disable | h56 r16 1.5px border #1d1f23 op50% | `MButton variant="secondary" disabled` (transparent bg, ink border 1.5, ink label, op .5) |
| Button text/44 | h44 r12 px16 label body/xs | text/logout link — keep as text Pressable OR MButton variant="text" |

Note: Figma font tokens list `Inter` for the bold-email line + the Logout text
button face — that is **DS drift**; per CEO ruling (memory: Claude DS state)
the app is **Poppins-only**. Use Poppins (uacBody* aliases) — do NOT introduce
Inter. This matches the rest of the auth flow.

## Components / variants / states

- **Open Mail app** — Primary, Enable, size 56. Always enabled. → `MButton` (primary, lg).
- **Resend email in(00s)** — Secondary, **Disable** in the Figma (cooldown
  active). Runtime: disabled during 60s cooldown, enabled after. Label is the
  countdown `Resend email in(NNs)` → `Resend verification email` when ready.
  → `MButton variant="secondary"` with `disabled={resendDisabled}`.
- **Logout** — Text button, Enable, size 44, top-right. → keep top-right text
  control (current `verify-logout-button`).
- **macgie-animate-2** — the brand mascot logo (Figma "Macgie Animate 2",
  2849:8332). Code has `MacgieLogo` (== that component, image a11y "Macgie",
  Reduce-Motion-aware) and `MacgieLoader asLogo` (used by Welcome). → render
  `MacgieLogo size={126}` (height 126 matches Figma; width derives from aspect).
- **Spinner** `streamline-ultimate:loading` 24×24 — current screen already has
  an animated `SpinnerGlyph`. Keep (rotates via Animated, fine).

## What the CURRENT screen gets WRONG (vs Figma)

1. **Hero mark = gray placeholder box** (`heroIllustration` empty View 130×90,
   `uacColorNeutral100` bg). Figma = the **macgie mascot** (103×126). FIX:
   render `<MacgieLogo size={126} />`. (The code comment even says "placeholder
   … real asset import lands when batch-D consolidates the shared logo".)
2. **Buttons hand-rolled** (`Pressable` + `buttonBase/buttonPrimary/
   buttonSecondary`). DS rule (GH-364) + the rest of the auth migration →
   replace with `MButton` (primary "Open Mail app" + secondary "Resend").
3. Spacing: Figma hero block top y171, action stack y546. Current uses
   `paddingTop: uacDimension24*4` for hero + a single flex body. Keep visually
   close: hero near top third, action stack toward the bottom. The current
   single-`body` column with `alignItems:center` is acceptable; just swap the
   placeholder + buttons.

## testIDs to PRESERVE (Maestro/QA — verified none referenced in maestro/ but keep stable)

`verify-logout-button`, `verify-hero-mark`, `verify-title`,
`verify-body-line-a`, `verify-body-email`, `verify-body-line-c`,
`verify-open-mail-button`, `verify-resend-button` / `verify-resend-button-cooldown`,
`verify-status-text`, `verify-status-spinner`.

## Open questions

- None blocking. Resend cooldown duration (60s) is an existing product default,
  unchanged. Inter→Poppins is settled (Poppins-only CEO ruling).

## New BE fields

- None. No API/contract change. Resend uses the existing
  `useResendVerificationMutation`; no new tracking events (handlers unchanged —
  `email_verification_resent` already fires).
