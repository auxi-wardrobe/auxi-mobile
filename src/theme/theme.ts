export const theme = {
  colors: {
    primary: '#000000', // Black
    secondary: '#333333', // Dark Gray
    background: '#FFFFFF', // White
    surface: '#F5F5F5', // Light Gray
    text: '#000000', // Black
    textSecondary: '#666666', // Gray
    error: '#D32F2F', // Red
    success: '#388E3C', // Green
    border: '#E0E0E0', // Light Gray Border
    white: '#FFFFFF',
    transparent: 'transparent',
    // Macgie mascot (loading character) — source: figma.site idle-loop loader.
    // Black cat-head silhouette with shaded white eyes + black pupils.
    macgieBody: '#000000', // head fill
    macgieEyeLight: '#D6D6D6', // eye-white gradient start (shaded edge)
    macgieEyeWhite: '#FFFFFF', // eye-white gradient end
    macgiePupil: '#000000', // pupil fill
    // Figma aliases for route-screen parity
    figmaBackground: '#FFFFFF', // app screen background — white per design
    figmaCardSurface: '#f2efec', // background/primary/subtle_50 — clothing tile bg
    figmaCardTag: 'rgba(18,18,18,0.75)', // color/neutral/black/Alpha300 (#121212bf)
    figmaSurface: '#FFFFFF',
    // Home Grid View (AU-253) tokens — Figma node 2849:11340
    // Source: plans/260525-1505-home-grid-view-extraction/figma-extraction-home-grid-view.md
    figmaCaptionPillBg: '#eee6df', // color/primary/100 — caption pill bg (Frame 2036)
    figmaInsightPillBg: '#e0d2c4', // color/primary/200 — insight icon pill bg (Frame 2037)
    figmaCtaLabel: '#262421', // border/primary/bold_600 — "Wear this" CTA label
    figmaPrimary600: '#1C1A19', // color/primary/600 — refine sheet "Skip for now" text button
    figmaFooterActivePill: '#eee6df', // background/primary/subtle_200 — footer active-tab pill
    figmaTooltipBg: '#322f35', // Schemes/Inverse Surface — Plain Tooltip bg
    figmaTooltipText: '#f5eff7', // Schemes/Inverse On Surface — Plain Tooltip text
    figmaSurfaceSoft: '#F3F5F9',
    // Outfit Canvas / Remix (AU-285) — graph-paper grid line on the #f2efec
    // canvas. Sampled from Figma remix frame (node 2852:16582); the grid is a
    // 16px square LINE grid, line tone between subtle_50 (#f2efec) and
    // subtle_100 (#e0d2c4). Source:
    // plans/260527-1817-canvas-figma-fidelity/figma-extraction-outfit-canvas.md
    figmaCanvasGridLine: '#e9e0d8',
    figmaText: '#272A32',
    figmaTextPrimary: '#272A32',
    figmaTextSecondary: '#616161',
    // Canonical bottom-sheet text tone (color/neutral/800). Every bottom-sheet
    // title (interSemiboldXsSm, 14/20) and subtitle/body (interBodySm, 14/20)
    // reads at this ONE ink color — no primary/secondary split inside sheets.
    // Same hex as figmaPrimaryButtonBg; named separately for text intent.
    figmaSheetText: '#1D1F23',
    figmaTextMuted: '#49454F',
    figmaDivider: '#D1D3D8',
    // Barely-there hairline — Figma `border/neutral/subtle_300` (#f2f4f7).
    // Used for the favourite card's title-flanking dividers (Figma divider
    // component `3646:10000` / `3646:9997`); lighter than figmaDivider.
    figmaDividerSubtle: '#f2f4f7',
    figmaAction: '#272A32',
    figmaButton: '#272A32',
    // Canonical primary (solid) button tokens — the ONE source of truth for
    // every solid-dark primary CTA. Fill = color/neutral/800, label =
    // color/primary/100, paired with the `poppinsButton` (Poppins-Medium)
    // alias and a 16px radius. Don't reintroduce figmaAction/figmaButton/
    // figmaButtonDark or white as a primary-button fill/label.
    figmaPrimaryButtonBg: '#1D1F23', // color/neutral/800 — primary button fill
    figmaPrimaryButtonText: '#EFE9E3', // color/primary/100 — primary button label
    // Primary ICON button: same fill as the primary button, but the icon uses
    // color/primary/50 (NOT the /100 text tone). For icon-only CTAs (submit
    // chevrons / arrows).
    figmaPrimaryButtonIcon: '#F2EFEC', // color/primary/50 — primary icon-button icon
    figmaRed: '#CC4C3E',
    figmaIconSurface: '#E3E3EC',
    figmaDestructive: '#bb251a', // red for Cancel/delete actions — aliased by uacTextDangerBase below
    figmaAiSparkle: '#822be6', // purple AI-sparkle accent — self-visualization icon (Figma 472:2030, purple→magenta gradient median)
    figmaOnboardingBackground: '#FFFFFF', // onboarding screens bg — white per design
    // Onboarding redesign (node 2849:8331) — 3 genuinely-new colors.
    // Source: plans/260526-1443-onboarding-figma-extraction/figma-extraction-onboarding.md §4.1
    // Everything else reuses existing tokens (caption pill = figmaCardTag rgba(18,18,18,0.75) per D5;
    // screen bg #fcfcfd = uacBackgroundNeutral50; loading/outro bg #eee6df = figmaCaptionPillBg).
    figmaOnboardingStepLabel: '#9e968e', // text/primary/bold_400 — "Step n/3" label + muted greige
    figmaChipBg: '#5b5550', // background/primary/bold_500 — selected "You selected" chip bg + AU-303 active pagination dot (icon/primary/bold_500, same hex)
    // AU-303 two-axis swipe (Figma node 3140-8191) — 2 token drifts confirmed by
    // figma-theme-sync + qa-ui review-extraction PASS (2026-05-31).
    // Source: plans/260531-1326-au-303-two-axis-swipe/figma-extraction-au303-guidance.md §8
    figmaDotInactive: '#c6bcb1', // icon/primary/subtle_300 — inactive pagination dot
    figmaOverlayScrim: 'rgba(38, 36, 33, 0.7)', // background/primary/bold_600 (#262421) @ 70% — guidance-overlay backdrop
    dialogScrim: 'rgba(25, 27, 34, 0.3)', // ink (#191b22) @ 30% — centered dialog/modal backdrop (Settings + AI-consent dialogs)
    figmaOnboardingStickyBarBg: 'rgba(255, 255, 255, 0.6)', // color/neutral/white/Alpha200 — Step-3 sticky bar (backdrop-blur 2 in Figma)
    figmaTextDark: '#070707', // near-black for expand/collapse text buttons
    // Sidebar dark redesign (node 2852:24670) — divider hairline on the dark
    // sidebar bg. Figma maps Black/10% but that is invisible on #1d1f23, so per
    // CEO (Q9) use the cream text tone (#f2efec / uacTextPrimaryBase) at 10%.
    figmaDividerOnDark: 'rgba(242, 239, 236, 0.1)',
    // Settings redesign (node 2850:15840) — 5-frame redesign tokens.
    // Source: plans/260526-0019-settings-redesign/figma-extraction-settings.md
    figmaToggleOn: '#039855', // fixed/success/base — radio ON (green); see ds.color.green
    figmaSwitchOn: '#16a085', // DS --teal: canonical switch-active. Split from radio green per Auxi Design System (auxi-ds.css .uiswitch[aria-checked=true])
    figmaToggleOffTrack: '#e4e7ec', // background/neutral/subtle_200 — switch OFF track (Q2 resolved)
    figmaButtonDark: '#121212', // background/neutral/bold_400 — primary dialog button bg (Update)
    figmaListDivider: '#eee6df', // border/primary/subtle_300 — settings list hairline divider
    figmaDetailSurface: '#eee6df', // background/primary/subtle_200 — body-photo detail panel bg
    // UAC (Account-access flow) tokens — AU-242 spec
    // Spec: plans/260521-2335-au-242-figma-spec/00-index.md "Colors"
    uacBackgroundBase: '#1d1f23', // --background/neutral/base
    uacBackgroundNeutralSubtlest: '#fcfcfd', // --background/neutral/subtlest
    uacBackgroundNeutral50: '#fcfcfd', // --background/primary/neutral_50 (alias)
    uacColorNeutral100: '#f2f4f7', // --color/neutral/100
    uacBorderBase: '#1d1f23', // --border/neutral/base
    uacBorderBold200: '#7a7f89', // --border/neutral/bold_200
    uacTextBase: '#1d1f23', // --text/neutral/base
    uacTextSubtle100: '#40444d', // --text/neutral/subtle_100
    uacTextSubtle200: '#7a7f89', // --text/neutral/subtle_200
    uacTextPrimaryBase: '#f2efec', // --text/primary/base (light text on dark bg)
    uacTextDangerBase: '#bb251a', // --text/danger/base (= figmaDestructive)
    uacTextInfoBase: '#1465b4', // --text/info/base
    uacOnSurfaceVariant: '#49454f', // M3/sys/light/on-surface-variant
    // Item Detail redesign (AU-311, Figma node 2852:7175). Source:
    // plans/260610-1632-au311-item-detail-figma/figma-extraction-item-detail.md §Tokens
    figmaItemDetailDanger: '#c0392b', // text/danger/base — Less used label + Trash icon
    figmaItemDetailFavoriteActive: '#eedcdd', // soft pink — active heart button bg
    figmaItemDetailLessUsedActive: '#f6edee', // soft pink — active "Less used" pill bg
    figmaItemDetailRowText: '#1d1f23', // text/neutral/base — detail row label + value
    figmaItemDetailColorDotBorder: '#536173', // color-swatch dot border
    figmaItemDetailImageFallbackBg: '#e8ebf0', // image-unavailable placeholder bg
    figmaItemDetailModalDivider: '#ececec', // picker header hairline
    figmaItemDetailOptionDivider: '#f0f0f0', // picker option-row hairline
    figmaItemDetailOptionDotBorder: '#d0d5dd', // border/neutral/subtle_100 — color option dot border
    figmaItemDetailModalClose: '#4f4f4f', // picker "Close" label
    // AU-312 item-detail pushed screen (Figma node 2852:14557). Source:
    // plans/260611-1424-linear-autopilot-eval/figma-extraction-item-detail.md
    figmaOverlayDark10: 'rgba(130, 113, 55, 0.1)', // background/overlay/dark/10 (#8271371a) — back-button drop-shadow tint
    figmaItemDetailHeaderBg: 'rgba(255, 255, 255, 0.9)', // header bar: background/neutral/subtlest @90% — used as reducedTransparency fallback for accessibility users; layered over BlurView when transparency is on
    // Backdrop-blur tint over @react-native-community/blur (Figma slab fill =
    // background/neutral/subtlest @ 80%, node 3227:13480). Paired with
    // BlurView blurType="light" blurAmount=8 to render the real Gaussian
    // backdrop the CEO flagged. Used by HomeViewToggleFooter + OnboardingStyles.
    figmaBlurTintWhite80: 'rgba(255, 255, 255, 0.8)',
    // AU-361 "item ready" M3 snackbar (Figma node 3915:30077). Teal/mint
    // success surface. Source:
    // plans/260617-1743-au-361-item-ready-toast/figma-extraction-item-ready-toast.md §Snackbar visual spec
    figmaSnackbarSuccessBg: '#4cf4d3', // color/success/200 — snackbar surface
    // Wardrobe grid "less use" tile badge fill — soft coral/salmon so the demoted
    // tag reads distinctly from the mint "new" and dark "common" pills. Pairs
    // with figmaItemDetailDanger (#c0392b) text. Source: wardrobe card status spec.
    figmaTileLessUsedBadgeBg: '#f3a39e',
    // Home header favourites heart "you have saved looks" indicator dot. Same
    // DS color/success/200 mint as the item-ready snackbar.
    figmaFavouriteDot: '#4cf4d3',
    // Black "info" snackbar (Figma node 3910:22127). Used for dismissible
    // toasts that add UI complexity (AI-generated disclosure, "seen them all"
    // limited-suggestion notice) — black surface, white label, close button.
    figmaSnackbarInfoBg: '#1d1f23', // color/neutral/base — info snackbar surface
    // Informational toast surface (background/primary/bold_700) — the "something
    // new happened" toast (e.g. refine "Relaxed applied!"). Deliberately darker
    // than figmaSnackbarInfoBg and distinct from the turquoise success toast.
    figmaToastInfoBg: '#070707', // background/primary/bold_700
    // Glyph + text reuse existing tokens: icon = figmaTextDark (#070707,
    // icon/primary/bold_700), text = uacTextBase (#1d1f23, text/neutral/base).
    // Home-loading shimmer (AU-364, Figma node 2850:11205 "Home - loading").
    // The loading outfit slots use a diagonal warm→greige ramp
    // (linear-gradient(230deg, #f2efec 26.8% → #d5ccc3 84%)). The start stop is
    // `cream` (#f2efec, figmaCardSurface); the END stop has no prior token.
    // Source: figma get_design_context node 2850:11215.
    figmaSkeletonRampEnd: '#d5ccc3', // skeleton/shimmer gradient end-stop (greige)
    // background/overlay/light/30 (#ffffff4d) — translucent white surface behind
    // the tile pin badge. Was an inline literal in `pinBadge`; promoted to a
    // token so the loading-state pin reuses the same value (DRY).
    figmaOverlayLight30: 'rgba(255, 255, 255, 0.3)',
    // color/primary/700 (#0C0B0B) — icon tint for the secondary button
    // (bordered, no-fill). Distinct from figmaTextDark (#070707, the text label
    // tone); per design the secondary-button icon is one step warmer/darker.
    iconPrimary700: '#0C0B0B',
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
    // UAC named constants — AU-242 spec
    uacBodyPadding: 24, // --body horizontal padding
    uacDimension24: 24,
    uacDimension16: 16,
    uacDimension12: 12, // dimension/12 - 0.75rem — caption/icon pill padX, pager gaps
    uacDimension8: 8,
    uacDimension4: 4,
    uacButtonPaddingX: 20,
    uacButtonPaddingY: 16,
    uacButtonHeight: 56,
    uacListItemMinHeight: 56,
    uacHeaderHeight: 107,
    uacSafeAreaTop: 112,
    uacSafeAreaBottom: 12,
  },
  typography: {
    fontFamily: 'Poppins-Regular', // Use system font for now
    sizes: {
      h1: 32,
      h2: 24,
      h3: 20,
      body: 16,
      caption: 12,
      button: 16,
    },
    weights: {
      regular: '400',
      medium: '500',
      bold: '700',
    },
    aliases: {
      playfairDisplayTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 40,
        lineHeight: 52,
      },
      playfairDisplaySection: {
        fontFamily: 'Poppins-Medium',
        fontSize: 24,
        lineHeight: 32,
      },
      playfairDisplayHeader: {
        fontFamily: 'Poppins-Medium',
        fontSize: 40,
        lineHeight: 56,
      },
      manropeBody: {
        fontFamily: 'Poppins-Medium',
        fontSize: 16,
        lineHeight: 24,
      },
      manropeCaption: {
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        lineHeight: 20,
      },
      archivoBody: {
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0.15,
      },
      archivoButton: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0.15,
      },
      poppinsBody: {
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0,
      },
      poppinsButton: {
        fontFamily: 'Poppins-Medium',
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0,
      },
      // Legal documents (Terms / Privacy) — Figma node 3177:6642 document
      // title + section headings render Poppins Bold 16/24, tracking 0.15.
      // Bold via the bundled face (RN `fontWeight` can't restyle a named
      // custom font reliably), so this is a distinct alias from poppinsBody.
      poppinsBodyBold: {
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0.15,
      },
      // Settings redesign (node 2850:15840) — main-list big time value.
      // Figma heading/H2 = Poppins Bold 32/40, letter-spacing −0.64.
      poppinsTimeLg: {
        fontFamily: 'Poppins-Bold',
        fontSize: 32,
        lineHeight: 40,
        letterSpacing: -0.64,
      },
      // Settings redesign — small Poppins body (body/sm).
      // Figma body/sm = Poppins Regular 14/16 (main-list "AM" period label).
      poppinsBodySm: {
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        lineHeight: 16,
        letterSpacing: 0,
      },
      // UAC (Account-access flow) typography — AU-242 spec
      // Spec: plans/260521-2335-au-242-figma-spec/00-index.md "Typography"
      uacH1Bold: {
        fontFamily: 'Poppins-Bold',
        fontSize: 40,
        lineHeight: 52,
      },
      uacH4Bold: {
        fontFamily: 'Poppins-Bold',
        fontSize: 24,
        lineHeight: 32,
      },
      // AU-312 item-detail title (Figma 2852:14557 "Denim jacket").
      // Figma H4/SemiBold = Poppins SemiBold 24/32 — weight 600, NOT the 700
      // of uacH4Bold above. Poppins-SemiBold.ttf is bundled.
      poppinsH4SemiBold: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 24,
        lineHeight: 32,
      },
      uacBodyMdSemibold: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 16,
        lineHeight: 24,
      },
      // Settings redesign — Delete-data dialog title (Frame 4).
      // Inter SemiBold 16/20 (Text-md l-20/Semibold) — line-height 20, not 24.
      interSemiboldSm: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 16,
        lineHeight: 20,
      },
      // Favourite remove bottom-sheet title (Figma 3539:23380).
      // Inter SemiBold 14/20 (body/sm Semibold) — one size smaller than
      // interSemiboldSm (16/20); the sheet header reads at body/sm, not Text-md.
      interSemiboldXsSm: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
        lineHeight: 20,
      },
      uacBodyMdMedium: {
        fontFamily: 'Poppins-Medium',
        fontSize: 16,
        lineHeight: 24,
      },
      uacBodyMdRegular: {
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
        lineHeight: 24,
      },
      uacBodyXsRegular: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        lineHeight: 16,
      },
      uacBodyXsMedium: {
        fontFamily: 'Poppins-Medium',
        fontSize: 12,
        lineHeight: 16,
      },
      // Home header weather temperature — Figma 3227:19834 (Inter SemiBold 12/16).
      interSemiboldXs: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
        lineHeight: 16,
      },
      // Onboarding redesign (node 2849:8331) — Text-xxs caption pill label.
      // Figma Text-xxs = Inter Regular 10/12. No existing 10/12 Inter alias.
      // Source: figma-extraction-onboarding.md §4.2
      interCaptionXxs: {
        fontFamily: 'Poppins-Regular',
        fontSize: 10,
        lineHeight: 12,
      },
      // Wardrobe add-item flow (node 2852:19750) — Inter body text.
      // Text-md (l-24) Regular 16/24, Text-sm (l-20) Regular/Medium 14/20.
      interBodyMd: {
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
        lineHeight: 24,
      },
      interBodySm: {
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        lineHeight: 20,
      },
      interMediumSm: {
        fontFamily: 'Poppins-Medium',
        fontSize: 14,
        lineHeight: 20,
      },
      uacM3BodyLarge: {
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
        lineHeight: 24,
      },
      uacM3BodySmall: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        lineHeight: 16,
        letterSpacing: 0.4,
      },
    },
  },
  borderRadius: {
    s: 4,
    m: 8,
    l: 16,
    round: 9999,
    // Home Grid View (AU-253): border-radius/xl = 12 — outfit image tile radius
    figmaTile: 12,
    // Onboarding redesign (node 2849:8331): border-radius/sm = 6 — "You selected" chip radius
    chip: 6,
    // UAC named radii — AU-242 spec
    uacScreen: 18,
    uacPanel: 16,
    uacButtonCta: 16,
    uacButtonText: 12,
    uacTextField: 8,
    uacRadioPill: 100,
  },
  /**
   * Stacking order (z-index) — canonical six-tier model.
   * Source: Figma `z-index` frame (node 3230:35022). Rule: docs/Z_INDEX_LAYERING.md.
   * Bottom → top. Gaps are intentional so future sub-layers never force a
   * renumber. RN note: `zIndex` only orders siblings in the same stacking
   * context — render Dim/Modal/Toast at a root overlay host, and keep Android
   * `elevation` consistent with the tier order. Never hardcode a raw zIndex.
   */
  zIndex: {
    base: 0, // tier 0 — background, canvas, scroll content
    content: 1, // tier 1 — cards, buttons, chips, bubble chats
    sticky: 100, // tier 2 — header, footer/tab bar, floating CTA
    dim: 1000, // tier 3 — scrim that blocks interaction
    modal: 1100, // tier 4 — popup, bottom sheet, dialog
    toast: 1200, // tier 5 — toast, snackbar, global loading
  },
  /**
   * ── Auxi Design System — canonical token layer ──────────────────────────
   * Mirrors `Auxi Design System.html` / `auxi-ds.css`, extracted from Auxi.fig.
   * The `figma*` / `uac*` tokens above are the historical per-feature aliases;
   * each canonical token notes its alias. New code and the in-app Design System
   * screen read from `theme.ds`. This layer is ADDITIVE — it does not alter the
   * tokens existing screens already consume.
   */
  ds: {
    color: {
      // Ink & neutrals
      ink: '#1d1f23', // primary text / primary button (alias: uacBackgroundBase, uacBorderBase, uacTextBase)
      black: '#070707', // control fills / radio dot (alias: figmaTextDark)
      primary700: '#0c0b0b', // color/primary/700 — secondary-button icon tint (alias: iconPrimary700)
      slate: '#272a32', // deep slate (alias: figmaText, figmaButton)
      onVariant: '#49454f', // MD3 on-surface-variant (alias: uacOnSurfaceVariant, figmaTextMuted)
      warm700: '#5b5550', // warm gray stroke (alias: figmaChipBg)
      warm500: '#9e968e', // warm muted text (alias: figmaOnboardingStepLabel)
      gray500: '#717171', // neutral gray
      // Surfaces (warm paper)
      white: '#ffffff',
      surface: '#fcfcfd', // dialog / sheet surface (alias: uacBackgroundNeutralSubtlest)
      surface2: '#f7f7f8', // subtle surface (alias: figmaOnboardingBackground)
      cream: '#f2efec', // primary warm surface / cards (alias: figmaBackground, figmaCardSurface)
      warm100: '#eee6df', // divider / warm hairline (alias: figmaCaptionPillBg, figmaListDivider)
      tan: '#e0d2c4', // warm accent surface (alias: figmaInsightPillBg)
      tanStroke: '#c6bcb1', // tan stroke (alias: figmaDotInactive)
      placeholder: '#d9d9d9', // image placeholder fill
      cool100: '#e3e3ec', // cool surface (alias: figmaIconSurface)
      // Functional accents
      teal: '#16a085', // switch active / success — DS canonical switch-ON (alias: figmaSwitchOn)
      green: '#039855', // radio / confirm green (alias: figmaToggleOn)
      danger: '#bb251a', // destructive, applied (alias: uacTextDangerBase, figmaDestructive)
      red: '#ff0000', // destructive, raw — flagged off-system in DS; avoid in new code
      // Drop-shadow ink. iOS `shadowColor` only — pair with each surface's own
      // offset/opacity/radius. Replaces the raw `#000000`/`#000` shadowColor
      // literals the token-lint flagged in dialog/sheet/floating components.
      shadow: '#000000',
    },
    radius: {
      xs: 2, // checkbox
      sm: 12, // text button (alias: uacButtonText, figmaTile)
      md: 16, // primary button / dialog (alias: uacButtonCta, uacPanel)
      lg: 17, // secondary button
      xl: 18, // sheet (alias: uacScreen)
      full: 100, // pill / round (alias: uacRadioPill)
    },
    line: 'rgba(29,31,35,0.10)',
    line2: 'rgba(29,31,35,0.06)',
    hairline: '#eee6df',
    // RN approximations of the DS web box-shadows (--sh-card / --sh-dialog / --sh-sheet).
    shadow: {
      card: {
        shadowColor: '#1d1f23',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 4,
      },
      // Soft floating drop-shadow for the Home header icon buttons (menu +
      // favorite) — matches the baked card shadow on Figma 2849:11987
      // (Rectangle105): a light, diffuse shadow offset mostly downward.
      // Smaller than `card` because the surface is a 44px pill, not a full card.
      floatingButton: {
        shadowColor: '#1d1f23',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
      },
      // Header icon chips (menu / back / action buttons, left or right).
      // Figma drop-shadow(5.921px 11.842px 23.684px rgba(130,113,55,0.10)) —
      // tint = background/overlay/dark/10 (#827137 @10%). Paired with a 44×44
      // white (#FFF) surface at radius 8 on every TopIconButton.
      headerIcon: {
        shadowColor: '#827137',
        shadowOffset: { width: 5.921, height: 11.842 },
        shadowOpacity: 0.1,
        shadowRadius: 23.684,
        elevation: 6,
      },
      dialog: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 40,
        elevation: 12,
      },
      // Material "elevation/dialog" drop-shadow for floating toasts. RN can't
      // stack two shadows, so this blends the DS pair
      // (0 4px 8px 3px rgba(0,0,0,0.15) + 0 1px 3px rgba(0,0,0,0.30)) into one
      // downward ambient shadow.
      toast: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 8,
      },
      sheet: {
        shadowColor: '#1d2646',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.25,
        shadowRadius: 40,
        elevation: 16,
      },
    },
    // Type-family ROLES (DS names). RN renders with bundled faces; mono
    // (JetBrains Mono) is NOT bundled, so the screen falls back to platform mono.
    font: {
      display: 'Poppins', // headings / display
      ui: 'Poppins', // primary UI
      uiAlt: 'Poppins', // alternate UI / body
      mono: 'JetBrains Mono', // labels / code (not bundled — falls back)
    },
  },
};

export type Theme = typeof theme;
