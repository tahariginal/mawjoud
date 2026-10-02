import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing, TOUCH_TARGET } from '@/design/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Option<T extends string> = { value: T; label: string; icon?: IconName };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.selected]}
          >
            {option.icon ? (
              <Icon
                name={option.icon}
                size={16}
                color={selected ? colors.textOnBrand : colors.textPrimary}
              />
            ) : null}
            <AppText
              variant="subhead"
              weight="semibold"
              color={selected ? colors.textOnBrand : colors.textPrimary}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.bgSurfaceMuted,
    borderRadius: radius.pill,
    padding: spacing.xxs,
  },
  segment: {
    flex: 1,
    minHeight: TOUCH_TARGET - 4,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  selected: { backgroundColor: colors.bgBrand },
});
