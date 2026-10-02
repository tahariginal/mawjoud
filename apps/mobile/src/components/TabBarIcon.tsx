import type { ColorValue } from 'react-native';

import { Icon, type IconName } from './ui/Icon';

/** Tab icon that switches to the filled glyph when selected (shape + color, not color alone). */
export function tabIcon(active: IconName, inactive: IconName) {
  function TabBarIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return <Icon name={focused ? active : inactive} size={24} color={color} />;
  }
  return TabBarIcon;
}
