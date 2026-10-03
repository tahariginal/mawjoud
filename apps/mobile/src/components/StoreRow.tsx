import type { StoreSummary } from '@mazal/contracts';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { formatDistance } from '@/lib/format';

import { Thumbnail } from './Thumbnail';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

type Props = { store: StoreSummary; subtitle?: string };

/** Thumbnail, two lines of text, chevron. No card: lists separate rows with hairlines. */
export function StoreRow({ store, subtitle }: Props) {
  const { t } = useTranslation();
  const distance =
    store.distanceM !== null ? formatDistance(store.distanceM, currentLocale()) : null;
  const line = subtitle ?? [distance, store.address.line1].filter(Boolean).join(' · ');
  const rating = store.rating ? `★ ${store.rating.average.toFixed(1)}` : null;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/store/[id]', params: { id: store.id } })}
      accessibilityRole="button"
      accessibilityLabel={[
        store.name,
        store.rating ? `${store.rating.average} / 5` : t('home.newStores'),
        line,
      ].join('. ')}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Thumbnail image={store.logo} categoryId={store.categoryId} name={store.name} />
      <View style={styles.text}>
        <AppText variant="headline" numberOfLines={1}>
          {store.name}
        </AppText>
        <AppText variant="subhead" color={colors.textSecondary} numberOfLines={1}>
          {rating ? (
            <AppText variant="subhead" weight="semibold">
              {rating}
            </AppText>
          ) : (
            <AppText variant="subhead" color={colors.accent}>
              {t('home.newStores')}
            </AppText>
          )}
          {line ? ` · ${line}` : ''}
        </AppText>
      </View>
      <Icon name="chevron-forward" size={18} color={colors.iconMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.6 },
  text: { flex: 1, gap: spacing.xxs },
});
