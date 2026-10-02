import type { StoreSummary } from '@mawjood/contracts';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing, TOUCH_TARGET } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { formatDistance } from '@/lib/format';

import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

type Props = { store: StoreSummary; subtitle?: string };

export function StoreRow({ store, subtitle }: Props) {
  const { t } = useTranslation();
  const distance =
    store.distanceM !== null ? formatDistance(store.distanceM, currentLocale()) : null;
  const line = subtitle ?? [distance, store.address.line1].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/store/[id]', params: { id: store.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${store.name}. ${line}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <Icon name="storefront-outline" size={22} color={colors.textBrand} />
      </View>
      <View style={styles.text}>
        <AppText variant="headline" numberOfLines={1}>
          {store.name}
        </AppText>
        <AppText variant="subhead" color={colors.textSecondary} numberOfLines={2}>
          {line}
        </AppText>
      </View>
      {store.rating ? (
        <View style={styles.rating} accessibilityLabel={`${store.rating.average} / 5`}>
          <Icon name="star" size={14} color={colors.textAccent} />
          <AppText variant="subhead" weight="semibold">
            {store.rating.average.toFixed(1)}
          </AppText>
        </View>
      ) : (
        <AppText variant="caption" color={colors.textBrand}>
          {t('home.newStores')}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: TOUCH_TARGET + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
  },
  pressed: { backgroundColor: colors.bgSurfaceMuted },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.bgBrandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: spacing.xxs },
  rating: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
});
