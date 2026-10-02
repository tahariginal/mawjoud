import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing, TOUCH_TARGET } from '@/design/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'destructive';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
};

const palettes: Record<Variant, { bg: string; bgPressed: string; fg: string; border: string }> = {
  primary: {
    bg: colors.actionPrimaryBg,
    bgPressed: colors.actionPrimaryBgPressed,
    fg: colors.actionPrimaryFg,
    border: colors.actionPrimaryBg,
  },
  secondary: {
    bg: colors.actionSecondaryBg,
    bgPressed: colors.actionSecondaryBgPressed,
    fg: colors.actionSecondaryFg,
    border: colors.actionSecondaryBg,
  },
  tertiary: {
    bg: 'transparent',
    bgPressed: colors.bgSurfaceMuted,
    fg: colors.textPrimary,
    border: 'transparent',
  },
  destructive: {
    bg: colors.bgSurface,
    bgPressed: colors.errorBg,
    fg: colors.errorFg,
    border: colors.errorFg,
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityHint,
  testID,
}: Props) {
  const inactive = disabled || loading;
  const p = palettes[variant];
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
        fullWidth && styles.fullWidth,
        {
          backgroundColor:
            inactive && variant === 'primary'
              ? colors.actionDisabledBg
              : pressed
                ? p.bgPressed
                : p.bg,
          borderColor: inactive && variant === 'primary' ? colors.actionDisabledBg : p.border,
        },
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? colors.actionDisabledFg : p.fg} />
        ) : icon ? (
          <Icon name={icon} size={18} color={inactive ? colors.actionDisabledFg : p.fg} />
        ) : null}
        <AppText
          variant="callout"
          weight="semibold"
          color={inactive && variant === 'primary' ? colors.actionDisabledFg : p.fg}
          numberOfLines={2}
          style={styles.label}
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: { textAlign: 'center', flexShrink: 1 },
});
