import type { BoundingBox, OfferSort, OffersQuery } from '@mawjood/contracts';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { useOffers } from '@/api/hooks';
import { OfferCard } from '@/components/OfferCard';
import { OffersMap } from '@/components/OffersMap';
import { TabHeader } from '@/components/TabHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Layout';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { colors, spacing } from '@/design/tokens';
import { activeFilterCount, pickupRange, useFilters } from '@/state/filters';
import { useLocationStore } from '@/state/location';

const SORTS: readonly OfferSort[] = ['relevance', 'distance', 'price', 'pickup_time'];

export default function ExploreScreen() {
  const { t } = useTranslation();
  const point = useLocationStore((s) => s.selected.point);
  const { filters, sort, view, setSort, setView, reset } = useFilters();
  const [bbox, setBbox] = useState<BoundingBox | null>(null);

  const query = useMemo((): Omit<OffersQuery, 'cursor'> => {
    const range = pickupRange(filters.pickupDay, new Date());
    return {
      ...(bbox ? { bbox } : { near: point, radiusM: filters.radiusM }),
      sort,
      limit: 20,
      categoryIds: filters.categoryIds.length ? filters.categoryIds : undefined,
      dietary: filters.dietary.length ? filters.dietary : undefined,
      maxPriceMinor: filters.maxPriceMinor ?? undefined,
      availableOnly: filters.availableOnly || undefined,
      minRating: filters.minRating ?? undefined,
      pickupFrom: range.from,
      pickupTo: range.to,
    };
  }, [bbox, point, filters, sort]);

  const offers = useOffers(query);
  const items = useMemo(() => offers.data?.pages.flatMap((p) => p.data) ?? [], [offers.data]);
  const filterCount = activeFilterCount(filters);

  const header = (
    <View style={styles.controls}>
      <SegmentedControl
        options={[
          { value: 'list', label: t('explore.list'), icon: 'list-outline' },
          { value: 'map', label: t('explore.map'), icon: 'map-outline' },
        ]}
        value={view}
        onChange={setView}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <Chip
          label={
            filterCount > 0 ? `${t('explore.filters')} (${filterCount})` : t('explore.filters')
          }
          icon="options-outline"
          selected={filterCount > 0}
          onPress={() => router.push('/filters')}
        />
        {SORTS.map((s) => (
          <Chip key={s} label={t(`sort.${s}`)} selected={sort === s} onPress={() => setSort(s)} />
        ))}
      </ScrollView>
      {bbox ? (
        <Chip
          label={t('explore.searchThisArea')}
          removable
          selected
          onPress={() => setBbox(null)}
        />
      ) : null}
      {offers.data ? (
        <AppText variant="subhead" color={colors.textSecondary} accessibilityLiveRegion="polite">
          {t('explore.results', { count: items.length })}
        </AppText>
      ) : null}
    </View>
  );

  let body;
  if (offers.isPending) {
    body = <ListSkeleton rows={3} rowHeight={220} />;
  } else if (offers.isError) {
    body = (
      <ErrorState
        error={offers.error}
        onRetry={() => void offers.refetch()}
        retrying={offers.isRefetching}
      />
    );
  } else if (view === 'map') {
    body = (
      <OffersMap
        center={point}
        offers={items}
        onSearchArea={setBbox}
        onShowList={() => setView('list')}
      />
    );
  } else if (items.length === 0) {
    body = (
      <EmptyState
        icon="search-outline"
        title={t('explore.empty')}
        body={t('explore.emptyBody')}
        actionLabel={filterCount > 0 || bbox ? t('explore.clearFilters') : undefined}
        onAction={() => {
          reset();
          setBbox(null);
        }}
      />
    );
  } else {
    body = (
      <FlashList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <OfferCard offer={item} />
          </View>
        )}
        onEndReached={() => {
          if (offers.hasNextPage && !offers.isFetchingNextPage) void offers.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshing={offers.isRefetching && !offers.isFetchingNextPage}
        onRefresh={() => void offers.refetch()}
        ListFooterComponent={
          offers.isFetchingNextPage ? (
            <ActivityIndicator accessibilityLabel={t('explore.loadMore')} style={styles.footer} />
          ) : null
        }
      />
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <TabHeader
        title={t('tabs.explore')}
        right={
          <Button
            label={t('home.searchA11y')}
            icon="search-outline"
            variant="tertiary"
            onPress={() => router.push('/search')}
          />
        }
      />
      {header}
      <View style={styles.flex}>{body}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.md },
  chips: { gap: spacing.sm, paddingEnd: spacing.lg },
  flex: { flex: 1 },
  item: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  footer: { padding: spacing.lg },
});
