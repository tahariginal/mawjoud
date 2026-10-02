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
          <View style={styles.offers}>
            {offers.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </View>
        )}
      </View>

      {s.hours.length > 0 ? (
        // Hours are optional for merchants: show the section only once they are set,
        // then list every weekday (Monday first) so missing days read as closed.
        <View style={styles.section}>
          <SectionHeader title={t('store.hours')} />
          <Card>
            {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
              const h = s.hours.find((x) => x.weekday === weekday);
              return (
                <View key={weekday} style={styles.hoursRow}>
                  <AppText variant="subhead" style={styles.flex}>
                    {weekdayName(weekday, locale)}
                  </AppText>
                  <AppText variant="subhead" color={h ? colors.textPrimary : colors.textSecondary}>
                    {h ? `${h.opensAt}–${h.closesAt}` : t('store.closed')}
                  </AppText>
                </View>
              );
            })}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  offers: { gap: spacing.xxl },
  hoursRow: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
