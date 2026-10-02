import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useStore } from '@/api/hooks';
import { FavoriteButton } from '@/components/FavoriteButton';
import { OfferCard } from '@/components/OfferCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card, Screen, SectionHeader } from '@/components/ui/Layout';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { colors, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { openDirections } from '@/lib/directions';
import { formatDistance } from '@/lib/format';
import { useLocationStore } from '@/state/location';

/** Localized weekday name; 2024-01-07 was a Sunday (weekday 0). */
function weekdayName(weekday: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2024, 0, 7 + weekday)),
  );
}

export default function StoreScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const point = useLocationStore((s) => s.selected.point);
  const store = useStore(id, point);
  const locale = currentLocale();

  if (store.isPending) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <ListSkeleton rows={3} />
      </Screen>
    );
  }
  if (store.isError) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <ErrorState
          error={store.error}
          onRetry={() => void store.refetch()}
          retrying={store.isRefetching}
        />
      </Screen>
    );
  }

  const { store: s, offers, isFavorite } = store.data;
  return (
    <Screen scroll>
      <Stack.Screen
        options={{
          title: s.name,
          headerRight: () => <FavoriteButton storeId={s.id} isFavorite={isFavorite} />,
        }}
      />
      <Card>
        <AppText variant="title2" accessibilityRole="header">
          {s.name}
        </AppText>
        {s.description ? <AppText variant="body">{s.description}</AppText> : null}
        <AppText variant="subhead" color={colors.textSecondary}>
          {s.address.line1}, {s.address.city}
          {s.distanceM !== null ? ` · ${formatDistance(s.distanceM, locale)}` : ''}
        </AppText>
        {s.rating ? (
          <AppText variant="subhead">
            ★ {s.rating.average.toFixed(1)} ({s.rating.count})
          </AppText>
        ) : null}
        <Button
          label={t('offer.directions')}
          icon="navigate-outline"
          variant="secondary"
          onPress={() => void openDirections(s.location, s.name)}
        />
      </Card>

      <View style={styles.section}>
        <SectionHeader title={t('store.offers')} />
        {offers.length === 0 ? (
          <EmptyState icon="heart-outline" title={t('store.noOffers')} />
        ) : (
          offers.map((o) => <OfferCard key={o.id} offer={o} />)
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('store.hours')} />
        <Card>
          {s.hours.length === 0 ? (
            <AppText variant="subhead" color={colors.textSecondary}>
              {t('store.closed')}
            </AppText>
          ) : (
            [...s.hours]
              .sort((a, b) => a.weekday - b.weekday)
              .map((h) => (
                <View key={h.weekday} style={styles.hoursRow}>
                  <AppText variant="subhead" style={styles.flex}>
                    {weekdayName(h.weekday, locale)}
                  </AppText>
                  <AppText variant="subhead">
                    {h.opensAt}–{h.closesAt}
                  </AppText>
                </View>
              ))
          )}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  hoursRow: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
