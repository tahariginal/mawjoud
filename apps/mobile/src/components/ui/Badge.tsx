import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/design/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type BadgeTone =
  'neutral' | 'success' | 'warning' | 'error' | 'info' | 'accent' | 'brand' | 'onImage';

const tones: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: colors.bgSurfaceMuted, fg: colors.textSecondary },
  success: { bg: colors.successBg, fg: colors.successFg },
  warning: { bg: colors.warningBg, fg: colors.warningFg },
  error: { bg: colors.errorBg, fg: colors.errorFg },
  info: { bg: colors.infoBg, fg: colors.infoFg },
  accent: { bg: colors.accentSoft, fg: colors.accent },
  brand: { bg: colors.bgInverse, fg: colors.textOnInverse },
  /** Over photos and image placeholders: white with primary text. */
  onImage: { bg: colors.bgSurface, fg: colors.textPrimary },
};

type Props = { label: string; tone?: BadgeTone; icon?: IconName };

export function Badge({ label, tone = 'neutral', icon }: Props) {
  const t = tones[tone];
  return (
    <View style={[styles.base, { backgroundColor: t.bg }]}>
      {icon ? <Icon name={icon} size={12} color={t.fg} /> : null}
      <AppText variant="caption" color={t.fg} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: spacing.xxs,
    borderRadius: radius.xs,
    alignSelf: 'flex-start',
  },
});
