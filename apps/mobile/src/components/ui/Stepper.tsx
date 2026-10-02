import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/design/tokens';

import { AppText } from './AppText';
import { IconButton } from './IconButton';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  decreaseLabel?: string;
  increaseLabel?: string;
};

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  decreaseLabel = 'Decrease',
  increaseLabel = 'Increase',
}: Props) {
  const canDecrease = value > min;
  const canIncrease = value < max;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment' && canIncrease) onChange(value + 1);
        if (event.nativeEvent.actionName === 'decrement' && canDecrease) onChange(value - 1);
      }}
    >
      <AppText variant="headline" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.controls}>
        <View style={!canDecrease && styles.disabled}>
          <IconButton
            icon="remove"
            accessibilityLabel={decreaseLabel}
            onPress={() => canDecrease && onChange(value - 1)}
            color={colors.textPrimary}
          />
        </View>
        <AppText variant="title2" style={styles.value}>
          {value}
        </AppText>
        <View style={!canIncrease && styles.disabled}>
          <IconButton
            icon="add"
            accessibilityLabel={increaseLabel}
            onPress={() => canIncrease && onChange(value + 1)}
            color={colors.textPrimary}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: { flex: 1 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSurface,
  },
  value: { minWidth: 32, textAlign: 'center' },
  disabled: { opacity: 0.35 },
});
