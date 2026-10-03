import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing, TOUCH_TARGET } from '@/design/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Tone = 'info' | 'warning' | 'error' | 'success' | 'neutral' | 'inverse';

const tones: Record<Tone, { bg: string; fg: string; icon: IconName }> = {
  info: { bg: colors.infoBg, fg: colors.infoFg, icon: 'information-circle-outline' },
  warning: { bg: colors.warningBg, fg: colors.warningFg, icon: 'warning-outline' },
  error: { bg: colors.errorBg, fg: colors.errorFg, icon: 'alert-circle-outline' },
  success: { bg: colors.successBg, fg: colors.successFg, icon: 'checkmark-circle-outline' },
  neutral: {
    bg: colors.bgSurfaceMuted,
    fg: colors.textPrimary,
    icon: 'information-circle-outline',
  },
  /** Dark block for the single most important thing on a screen (e.g. today's pickup). */
  inverse: { bg: colors.bgInverse, fg: colors.textOnInverse, icon: 'bag-check-outline' },
};

const ACTION_HEIGHT = 36;

type Props = {
  message: string;
  title?: string;
  tone?: Tone;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
};

/** Flat, soft-colored message block: icon and text left aligned, no border. */
export function Banner({ message, title, tone = 'info', icon, actionLabel, onAction }: Props) {
  const t = tones[tone];
  const inverse = tone === 'inverse';
  return (
    <View style={[styles.base, { backgroundColor: t.bg }]} accessibilityRole="summary">
      <Icon name={icon ?? t.icon} size={20} color={t.fg} />
      <View style={styles.body}>
        {title ? (
          <AppText variant={inverse ? 'headline' : 'subhead'} weight="semibold" color={t.fg}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="subhead" color={t.fg}>
          {message}
        </AppText>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            hitSlop={inverse ? (TOUCH_TARGET - ACTION_HEIGHT) / 2 : 8}
            style={({ pressed }) => [
              inverse ? styles.pillAction : styles.linkAction,
              pressed && styles.pressed,
            ]}
          >
            <AppText
              variant="subhead"
              weight="semibold"
              color={inverse ? colors.brand : t.fg}
              style={inverse ? undefined : styles.underline}
            >
              {actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  body: { flex: 1, gap: spacing.xxs },
  linkAction: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
  },
  pillAction: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    minHeight: ACTION_HEIGHT,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSurface,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  underline: { textDecorationLine: 'underline' },
});
