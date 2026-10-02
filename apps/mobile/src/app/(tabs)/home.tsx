import type { OfferSummary } from '@mawjood/contracts';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useHomeFeed, useImpact, useOrders } from '@/api/hooks';
import { LocationChip } from '@/components/LocationChip';
import { OfferCard } from '@/components/OfferCard';
import { usePickupLabel } from '@/components/Price';
import { DemoBadge } from '@/components/StatusBadges';
import { StoreRow } from '@/components/StoreRow';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { Card, Screen, SectionHeader } from '@/components/ui/Layout';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/StateViews';
import { colors, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { formatMoney, relativeDay } from '@/lib/format';
import { DEFAULT_FILTERS, useFilters } from '@/state/filters';
import { useLocationStore } from '@/state/location';
import { useSession } from '@/state/session';

function OfferRail({ title, offers }: { title: string; offers: OfferSummary[] }) {
  if (offers.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} variant="rail" />
        ))}
      </ScrollView>
    </View>
  );
}

function ActiveOrderBanner() {
  const { t } = useTranslation();
  const signedIn = useSession((s) => s.status === 'signedIn');
  const upcoming = useOrders('upcoming');
  const next = upcoming.data?.data.find(
    (o) =>
      (o.status === 'CONFIRMED' || o.status === 'READY_FOR_PICKUP') &&
      relativeDay(new Date(o.pickup.start), new Date(), o.pickup.timezone) === 'today',
  );
  const label = usePickupLabel(
    next?.pickup ?? {
      start: new Date().toISOString(),
      end: new Date().toISOString(),
      timezone: 'UTC',
    },
  );
  if (!signedIn || !next) return null;
  return (
    <View style={styles.section}>
      <Banner
        tone="success"
        icon="bag-check-outline"
        title={t('home.activeOrder', { store: next.store.name })}
        message={label}
        actionLabel={t('home.activeOrderCta')}
        onAction={() => router.push({ pathname: '/order/[id]', params: { id: next.id } })}
      />
    </View>
  );
}

function ImpactCard() {
  const { t } = useTranslation();
  const impact = useImpact();
  if (!impact.data || impact.data.ordersCompleted === 0) return null;
  return (
    <View style={styles.section}>
      <Card onPress={() => router.push('/impact')} accessibilityLabel={t('home.impact')}>
        <AppText variant="headline">{t('home.impact')}</AppText>
        <View style={styles.impactRow}>
          <View style={styles.flex}>
            <AppText variant="title2" color={colors.textPrimary}>
              {impact.data.itemsRescued}
            </AppText>
            <AppText variant="footnote" color={colors.textSecondary}>
              {t('impact.items')}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="title2" color={colors.textPrimary}>
              {formatMoney(impact.data.moneySaved, currentLocale())}
            </AppText>
            <AppText variant="footnote" color={colors.textSecondary}>
              {t('impact.moneySaved')}
            </AppText>
          </View>
        </View>
      </Card>
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const point = useLocationStore((s) => s.selected.point);
  const feed = useHomeFeed(point);
  const setFilters = useFilters((s) => s.setFilters);

  const openCategory = (categoryId: string) => {
    setFilters({ ...DEFAULT_FILTERS, categoryIds: [categoryId] });
    router.push('/explore');
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <LocationChip />
        <View style={styles.topActions}>
          <IconButton
            icon="search-outline"
            accessibilityLabel={t('home.searchA11y')}
            onPress={() => router.push('/search')}
          />
          <IconButton
            icon="person-circle-outline"
            accessibilityLabel={t('home.profileA11y')}
            onPress={() => router.push('/profile')}
          />
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={feed.isRefetching} onRefresh={() => void feed.refetch()} />
        }
      >
        <View style={styles.hero}>
          <AppText variant="display" color={colors.textPrimary} accessibilityRole="header">
            {t('home.hero')}
          </AppText>
          <DemoBadge />
        </View>
        <ActiveOrderBanner />

        {feed.isPending ? (
          <View style={styles.section}>
            <Skeleton height={24} width="60%" />
            <View style={styles.rail}>
              <Skeleton height={220} width={260} />
              <Skeleton height={220} width={260} />
            </View>
          </View>
        ) : feed.isError ? (
          <ErrorState
            error={feed.error}
            onRetry={() => void feed.refetch()}
            retrying={feed.isRefetching}
          />
        ) : feed.data.nearby.length === 0 && feed.data.newStores.length === 0 ? (
          <EmptyState
            icon="leaf-outline"
            title={t('explore.empty')}
            body={t('explore.emptyBody')}
            actionLabel={t('location.chooseTitle')}
            onAction={() => router.push('/location')}
          />
        ) : (
          <>
            <OfferRail title={t('home.nearby')} offers={feed.data.nearby} />
            <OfferRail title={t('home.pickupSoon')} offers={feed.data.pickupSoon} />
            <OfferRail title={t('home.favorites')} offers={feed.data.favoritesAvailable} />
            {feed.data.categories.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title={t('home.categories')} />
                <View style={styles.chips}>
                  {feed.data.categories.map((c) => (
                    <Chip key={c.id} label={c.name} onPress={() => openCategory(c.id)} />
                  ))}
                </View>
              </View>
            ) : null}
            {feed.data.newStores.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title={t('home.newStores')} />
                {feed.data.newStores.map((s) => (
                  <StoreRow key={s.id} store={s} />
                ))}
              </View>
            ) : null}
            <ImpactCard />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  topActions: { flexDirection: 'row' },
  content: { paddingBottom: spacing.huge, gap: spacing.xxl, paddingTop: spacing.sm },
  hero: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  section: { gap: spacing.md, paddingHorizontal: spacing.lg },
  rail: { gap: spacing.md, paddingEnd: spacing.lg, flexDirection: 'row' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  impactRow: { flexDirection: 'row', gap: spacing.lg },
  flex: { flex: 1 },
});
