import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colors } from '@/design/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  name: IconName;
  size?: number;
  color?: ColorValue;
  /** Icons are decorative unless a label is given. */
  accessibilityLabel?: string;
};

export function Icon({ name, size = 20, color = colors.icon, accessibilityLabel }: Props) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    />
  );
}
