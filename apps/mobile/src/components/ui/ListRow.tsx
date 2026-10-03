import { useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing, TOUCH_TARGET } from '@/design/tokens';

import { AppText } from './AppText';
import { GroupContext } from './context';
import { Icon, type IconName } from './Icon';

type Props = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  showChevron?: boolean;
  accessibilityHint?: string;
  testID?: string;
};

export function ListRow({
  title,
  subtitle,
  icon,
  onPress,
  right,
  destructive = false,
  showChevron = !!onPress,
  accessibilityHint,
  testID,
}: Props) {
  const inGroup = useContext(GroupContext);
  const rowStyle = [styles.row, inGroup && styles.inGroup];
  const color = destructive ? colors.errorFg : colors.textPrimary;
  const content = (
    <>
      {icon ? (
        <Icon name={icon} size={22} color={destructive ? colors.errorFg : colors.icon} />
      ) : null}
      <View style={styles.text}>
        <AppText variant="body" color={color} style={styles.title}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="footnote" color={colors.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {showChevron ? <Icon name="chevron-forward" size={18} color={colors.iconMuted} /> : null}
    </>
  );
  if (!onPress) {
    return (
      <View style={rowStyle} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [rowStyle, pressed && (inGroup ? styles.dimmed : styles.pressed)]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: TOUCH_TARGET + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgSurface,
  },
  inGroup: { paddingHorizontal: 0 },
  pressed: { backgroundColor: colors.bgSurfaceMuted },
  dimmed: { opacity: 0.6 },
  text: { flex: 1, gap: spacing.xxs },
  title: { textAlign: 'left' },
});
