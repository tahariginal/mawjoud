import { Pressable, StyleSheet } from 'react-native';

import { colors, elevation, radius, TOUCH_TARGET } from '@/design/tokens';

import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  color?: string;
  selected?: boolean;
  background?: boolean;
  testID?: string;
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  color = colors.icon,
  selected,
  background = false,
  testID,
}: Props) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? undefined : { selected }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        background && styles.background,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} size={22} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  background: { backgroundColor: colors.bgSurface, ...elevation.raised },
  pressed: { backgroundColor: colors.bgSurfaceMuted },
});
