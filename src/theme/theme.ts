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
