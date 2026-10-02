import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, spacing, TOUCH_TARGET } from '@/design/tokens';
import { useLocationStore } from '@/state/location';

import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

export function LocationChip() {
  const { t } = useTranslation();
  const selected = useLocationStore((s) => s.selected);
  return (
    <Pressable
      onPress={() => router.push('/location')}
      accessibilityRole="button"
      accessibilityLabel={t('location.a11yChip', { label: selected.label })}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      <Icon
        name={selected.source === 'device' ? 'navigate' : 'location-outline'}
        size={18}
        color={colors.textPrimary}
      />
      <AppText variant="subhead" weight="semibold" numberOfLines={1} style={styles.label}>
        {selected.label}
      </AppText>
      <Icon name="chevron-down" size={16} color={colors.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSurface,
    flexShrink: 1,
  },
  pressed: { backgroundColor: colors.bgSurfaceMuted },
  label: { flexShrink: 1 },
});
