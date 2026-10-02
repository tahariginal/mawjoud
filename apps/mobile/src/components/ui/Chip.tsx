import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, spacing, TOUCH_TARGET } from '@/design/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

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
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.unselected,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {selected && !removable ? (
        <Icon name="checkmark" size={16} color={colors.textOnBrand} />
      ) : null}
      {icon && !selected ? <Icon name={icon} size={16} color={colors.textBrand} /> : null}
      <AppText
        variant="subhead"
        weight="medium"
        color={selected ? colors.textOnBrand : colors.textPrimary}
        numberOfLines={1}
      >
        {label}
      </AppText>
      {removable ? (
        <Icon name="close" size={16} color={selected ? colors.textOnBrand : colors.icon} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TOUCH_TARGET - 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  unselected: { backgroundColor: colors.bgSurface, borderColor: colors.borderInput },
  selected: { backgroundColor: colors.bgBrand, borderColor: colors.bgBrand },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
