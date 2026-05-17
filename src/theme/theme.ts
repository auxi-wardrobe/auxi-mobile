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
    figmaDestructive: '#bb251a', // red for Cancel/delete actions
    figmaOnboardingBackground: '#f7f7f8', // onboarding screens bg (differs from app figmaBackground #f2efec)
    figmaTextDark: '#070707', // near-black for expand/collapse text buttons
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
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
    },
  },
  borderRadius: {
    s: 4,
    m: 8,
    l: 16,
    round: 9999,
  },
};

export type Theme = typeof theme;
