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
    // Figma aliases for route-screen parity
    figmaBackground: '#f2efec', // background/primary/subtle_50
    figmaCardSurface: '#f2efec', // background/primary/subtle_50 — clothing tile bg
    figmaCardTag: 'rgba(18,18,18,0.75)', // color/neutral/black/Alpha300 (#121212bf)
    figmaSurface: '#FFFFFF',
    // Home Grid View (AU-253) tokens — Figma node 2849:11340
    // Source: plans/260525-1505-home-grid-view-extraction/figma-extraction-home-grid-view.md
    figmaCaptionPillBg: '#eee6df', // color/primary/100 — caption pill bg (Frame 2036)
    figmaInsightPillBg: '#e0d2c4', // color/primary/200 — insight icon pill bg (Frame 2037)
    figmaCtaLabel: '#262421', // border/primary/bold_600 — "Wear this" CTA label
    figmaFooterActivePill: '#eee6df', // background/primary/subtle_200 — footer active-tab pill
    figmaTooltipBg: '#322f35', // Schemes/Inverse Surface — Plain Tooltip bg
    figmaTooltipText: '#f5eff7', // Schemes/Inverse On Surface — Plain Tooltip text
    figmaSurfaceSoft: '#F3F5F9',
    figmaText: '#272A32',
    figmaTextPrimary: '#272A32',
    figmaTextSecondary: '#616161',
    figmaTextMuted: '#49454F',
    figmaDivider: '#D1D3D8',
    figmaAction: '#272A32',
    figmaButton: '#272A32',
    figmaRed: '#CC4C3E',
    figmaIconSurface: '#E3E3EC',
    figmaDestructive: '#bb251a', // red for Cancel/delete actions — aliased by uacTextDangerBase below
    figmaOnboardingBackground: '#f7f7f8', // onboarding screens bg (differs from app figmaBackground #f2efec)
    figmaTextDark: '#070707', // near-black for expand/collapse text buttons
    // Sidebar dark redesign (node 2852:24670) — divider hairline on the dark
    // sidebar bg. Figma maps Black/10% but that is invisible on #1d1f23, so per
    // CEO (Q9) use the cream text tone (#f2efec / uacTextPrimaryBase) at 10%.
    figmaDividerOnDark: 'rgba(242, 239, 236, 0.1)',
    // Settings redesign (node 2850:15840) — 5-frame redesign tokens.
    // Source: plans/260526-0019-settings-redesign/figma-extraction-settings.md
    figmaToggleOn: '#039855', // fixed/success/base — switch + radio ON (green)
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
    fontFamily: 'System', // Use system font for now
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
        fontFamily: 'PlayfairDisplay-Bold',
        fontSize: 40,
        lineHeight: 52,
      },
      playfairDisplaySection: {
        fontFamily: 'PlayfairDisplay-Medium',
        fontSize: 24,
        lineHeight: 32,
      },
      playfairDisplayHeader: {
        fontFamily: 'PlayfairDisplay-Medium',
        fontSize: 40,
        lineHeight: 56,
      },
      manropeBody: {
        fontFamily: 'Manrope-Medium',
        fontSize: 16,
        lineHeight: 24,
      },
      manropeCaption: {
        fontFamily: 'Manrope-Regular',
        fontSize: 14,
        lineHeight: 20,
      },
      archivoBody: {
        fontFamily: 'ArchivoNarrow-Regular',
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0.15,
      },
      archivoButton: {
        fontFamily: 'ArchivoNarrow-SemiBold',
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
      // Figma Text-xs/Regular = font-family/body (Poppins) 12/16.
      // Use for small body labels (e.g. Home Grid "Show another"). Distinct
      // from uacBodyXsRegular, which is Inter 12/16 for the UAC auth flow.
      poppinsXs: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
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
      uacBodyMdSemibold: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        lineHeight: 24,
      },
      // Settings redesign — Delete-data dialog title (Frame 4).
      // Inter SemiBold 16/20 (Text-md l-20/Semibold) — line-height 20, not 24.
      interSemiboldSm: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
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
        fontFamily: 'Inter-Regular',
        fontSize: 12,
        lineHeight: 16,
      },
      uacBodyXsMedium: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        lineHeight: 16,
      },
      uacM3BodyLarge: {
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
        lineHeight: 24,
      },
      uacM3BodySmall: {
        fontFamily: 'Roboto-Regular',
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
    // UAC named radii — AU-242 spec
    uacScreen: 18,
    uacPanel: 16,
    uacButtonCta: 16,
    uacButtonText: 12,
    uacTextField: 8,
    uacRadioPill: 100,
  },
};

export type Theme = typeof theme;
