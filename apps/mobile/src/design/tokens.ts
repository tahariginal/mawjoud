/**
 * MAWJOOd design tokens. Source of truth: docs/UI_DESIGN_SYSTEM.md.
 * Components use semantic `colors`, never `palette` directly.
 * Contrast pairs were verified against WCAG 2.2 AA (see the design doc).
 *
 * Style: clean and minimal. White surfaces, black primary actions, one accent green
 * reserved for savings, "open now", success and the active state of brand elements.
 */
export const palette = {
  white: '#FFFFFF',
  gray50: '#F5F5F4',
  gray75: '#F0F0EF',
  gray100: '#EDEDEC',
  gray150: '#EBEBEA',
  gray300: '#D6D6D3',
  gray500: '#8A8A8A',
  gray600: '#6B6B6B',
  gray800: '#333333',
  black: '#111111',
  green700: '#0B7A4B',
  green50: '#E8F5EE',
  red700: '#B42318',
  red50: '#FEF0EE',
  amber800: '#8A5300',
  amber50: '#FFF6E0',
  blue700: '#1F5FA8',
  blue50: '#EEF4FB',
} as const;

export const colors = {
  bgApp: palette.white,
  bgSurface: palette.white,
  bgSurfaceMuted: palette.gray50,
  /** Dark block for the one element that must stand out (e.g. today's pickup). */
  bgInverse: palette.black,
  textOnInverse: palette.white,
  textPrimary: palette.black,
  textSecondary: palette.gray600,
  /** 3.45:1 on white — icons and other non-text UI only, never body text. */
  textTertiary: palette.gray500,
  /** Accent green: savings, "open now", success, selected brand states. */
  accent: palette.green700,
  accentSoft: palette.green50,
  icon: palette.black,
  iconMuted: palette.gray500,
  actionPrimaryBg: palette.black,
  actionPrimaryBgPressed: palette.gray800,
  actionPrimaryFg: palette.white,
  actionSecondaryBg: palette.gray50,
  actionSecondaryBgPressed: palette.gray150,
  actionSecondaryFg: palette.black,
  actionDisabledBg: palette.gray50,
  actionDisabledFg: palette.gray600,
  /** Off state of switches and similar controls (3.45:1 on white). */
  controlOff: palette.gray500,
  borderInput: palette.gray300,
  borderDivider: palette.gray100,
  focusRing: palette.black,
  skeleton: palette.gray75,
  successFg: palette.green700,
  successBg: palette.green50,
  errorFg: palette.red700,
  errorBg: palette.red50,
  warningFg: palette.amber800,
  warningBg: palette.amber50,
  infoFg: palette.blue700,
  infoBg: palette.blue50,
  scrim: 'rgba(17, 17, 17, 0.45)',
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
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Minimum touch target (dp). */
export const TOUCH_TARGET = 48;

/** Height of buttons and text fields (dp). */
export const CONTROL_HEIGHT = 52;

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fontFamily.bold, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  title1: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  title2: { fontFamily: fontFamily.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  headline: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 22 },
  callout: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 20 },
  subhead: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 19 },
  footnote: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const elevation = {
  /** Cards are flat: sections are separated by space and hairlines, not shadows. */
  card: {},
  /** Floating elements only: sticky footers, map overlays. */
  raised: {
    shadowColor: palette.black,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
} as const;
