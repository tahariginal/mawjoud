import { useContext } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, CONTROL_HEIGHT, radius, spacing, TOUCH_TARGET } from '@/design/tokens';

import { AppText } from './AppText';
import { FooterContext } from './context';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'destructive';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Defaults to true inside a Screen footer, false elsewhere. */
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
};

/**
 * Primary = black filled, secondary = muted filled, tertiary = text only,
 * destructive = text in the error color. No outlines.
 */
const palettes: Record<Variant, { bg: string; bgPressed: string; fg: string; filled: boolean }> = {
  primary: {
    bg: colors.actionPrimaryBg,
    bgPressed: colors.actionPrimaryBgPressed,
    fg: colors.actionPrimaryFg,
    filled: true,
  },
  secondary: {
    bg: colors.actionSecondaryBg,
    bgPressed: colors.actionSecondaryBgPressed,
    fg: colors.actionSecondaryFg,
    filled: true,
  },
  tertiary: {
    bg: 'transparent',
    bgPressed: colors.bgSurfaceMuted,
    fg: colors.brand,
    filled: false,
  },
  destructive: {
    bg: 'transparent',
    bgPressed: colors.errorBg,
    fg: colors.errorFg,
    filled: false,
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  fullWidth,
  accessibilityHint,
  testID,
}: Props) {
  const inFooter = useContext(FooterContext);
  const stretch = fullWidth ?? inFooter;
  const inactive = disabled || loading;
  const p = palettes[variant];
  const fg = inactive ? colors.actionDisabledFg : p.fg;
  return (
    <Pressable
      testID={testID}
      onPress={inactive ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        p.filled ? styles.filled : styles.text,
        stretch && styles.fullWidth,
        {
          backgroundColor:
            inactive && p.filled ? colors.actionDisabledBg : pressed ? p.bgPressed : p.bg,
        },
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : icon ? (
          <Icon name={icon} size={18} color={fg} />
        ) : null}
        <AppText variant="body" weight="semibold" color={fg} numberOfLines={2} style={styles.label}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  filled: { minHeight: CONTROL_HEIGHT },
  text: { minHeight: TOUCH_TARGET, paddingHorizontal: spacing.md },
  fullWidth: { alignSelf: 'stretch' },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: { textAlign: 'center', flexShrink: 1 },
});
