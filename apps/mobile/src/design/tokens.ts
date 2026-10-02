/**
 * MAWJOOd design tokens. Source of truth: docs/UI_DESIGN_SYSTEM.md.
 * Components use semantic `colors`, never `palette` directly.
 * Contrast pairs were verified against WCAG 2.2 AA (see the design doc).
 */
export const palette = {
  green900: '#0E3B2C',
  green800: '#14523C',
  green700: '#1C6B4E',
  green600: '#25805E',
  mint300: '#9FD3B6',
  mint100: '#E4F2EA',
  paper50: '#FBF8F2',
  paper100: '#F4EEE3',
  white: '#FFFFFF',
  ink900: '#17201B',
  ink700: '#3E4A43',
  ink600: '#56625B',
  ink500: '#6B776F',
  borderStrong: '#7D877F',
  borderSubtle: '#E6DFD2',
  terracotta700: '#A4471F',
  red700: '#B3261E',
  red50: '#FCEBEA',
  amber800: '#7A4F00',
  amber50: '#FFF3D6',
  blue700: '#1D5FA6',
  blue50: '#E6F0FA',
} as const;

export const colors = {
  bgApp: palette.paper50,
  bgSurface: palette.white,
  bgSurfaceMuted: palette.paper100,
  bgBrand: palette.green800,
  bgBrandSoft: palette.mint100,
  textPrimary: palette.ink900,
  textSecondary: palette.ink600,
  textOnBrand: palette.white,
  textBrand: palette.green800,
  textAccent: palette.terracotta700,
  icon: palette.ink700,
  iconMuted: palette.ink500,
  actionPrimaryBg: palette.green800,
  actionPrimaryBgPressed: palette.green900,
  actionPrimaryFg: palette.white,
  actionSecondaryBg: palette.white,
  actionSecondaryFg: palette.green800,
  actionSecondaryBorder: palette.green800,
  actionDisabledBg: palette.paper100,
  actionDisabledFg: palette.ink600,
  borderInput: palette.borderStrong,
  borderDivider: palette.borderSubtle,
  focusRing: palette.green700,
  successFg: palette.green800,
  successBg: palette.mint100,
  errorFg: palette.red700,
  errorBg: palette.red50,
  warningFg: palette.amber800,
  warningBg: palette.amber50,
  infoFg: palette.blue700,
  infoBg: palette.blue50,
  scrim: 'rgba(23, 32, 27, 0.45)',
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 48,
  max: 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Minimum touch target (dp). */
export const TOUCH_TARGET = 48;

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'Fraunces_600SemiBold',
} as const;

export const typography = {
  display: { fontFamily: fontFamily.display, fontSize: 32, lineHeight: 38 },
  title1: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 30 },
  title2: { fontFamily: fontFamily.semibold, fontSize: 20, lineHeight: 26 },
  headline: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 22 },
  callout: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 20 },
  subhead: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 19 },
  footnote: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const elevation = {
  card: {
    shadowColor: palette.ink900,
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  raised: {
    shadowColor: palette.ink900,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
} as const;
