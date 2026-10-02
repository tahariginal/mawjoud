import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/design/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Tone = 'info' | 'warning' | 'error' | 'success' | 'neutral';

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
};

type Props = {
  message: string;
  title?: string;
  tone?: Tone;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
};

export function Banner({ message, title, tone = 'info', icon, actionLabel, onAction }: Props) {
  const t = tones[tone];
  return (
    <View style={[styles.base, { backgroundColor: t.bg }]} accessibilityRole="summary">
      <Icon name={icon ?? t.icon} size={20} color={t.fg} />
      <View style={styles.body}>
        {title ? (
          <AppText variant="subhead" weight="semibold" color={t.fg}>
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
            hitSlop={8}
            style={styles.action}
          >
            <AppText variant="subhead" weight="semibold" color={t.fg} style={styles.underline}>
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
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  body: { flex: 1, gap: spacing.xxs },
  action: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
  },
  underline: { textDecorationLine: 'underline' },
});
