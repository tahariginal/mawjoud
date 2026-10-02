import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, spacing, TOUCH_TARGET } from '@/design/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

/** 36 dp visually; hit slop keeps the 48 dp touch target. */
const CHIP_HEIGHT = 36;
const HIT_SLOP = (TOUCH_TARGET - CHIP_HEIGHT) / 2;

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** Removable chips show a close icon and announce "remove". */
  removable?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  removable,
  disabled,
  accessibilityLabel,
}: Props) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled: !!disabled }}
      hitSlop={{ top: HIT_SLOP, bottom: HIT_SLOP }}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.unselected,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={16}
          color={selected ? colors.actionPrimaryFg : colors.textPrimary}
        />
      ) : null}
      <AppText
        variant="subhead"
        weight="medium"
        color={selected ? colors.actionPrimaryFg : colors.textPrimary}
        numberOfLines={1}
      >
        {label}
      </AppText>
      {removable ? (
        <Icon name="close" size={16} color={selected ? colors.actionPrimaryFg : colors.icon} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: CHIP_HEIGHT,
    paddingHorizontal: spacing.md + spacing.xxs,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  unselected: { backgroundColor: colors.bgSurfaceMuted },
  selected: { backgroundColor: colors.actionPrimaryBg },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
});
