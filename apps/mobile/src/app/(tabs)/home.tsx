import type { OfferSummary } from '@mazal/contracts';
import { router } from 'expo-router';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useHomeFeed, useImpact, useOrders } from '@/api/hooks';
import { LocationChip } from '@/components/LocationChip';
import { OfferCard } from '@/components/OfferCard';
import { usePickupLabel } from '@/components/Price';
import { DemoBadge } from '@/components/StatusBadges';
import { StoreRow } from '@/components/StoreRow';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Card, Divider, Screen, SectionHeader } from '@/components/ui/Layout';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/StateViews';
import { colors, CONTROL_HEIGHT, radius, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { formatMoney, relativeDay } from '@/lib/format';
import { DEFAULT_FILTERS, useFilters } from '@/state/filters';
import { useLocationStore } from '@/state/location';
import { useSession } from '@/state/session';

const RAIL_CARD_WIDTH = 280;

function OfferRail({ title, offers }: { title: string; offers: OfferSummary[] }) {
  const { t } = useTranslation();
  if (offers.length === 0) return null;
  return (
    <View style={styles.block}>
      <View style={styles.pad}>
        <SectionHeader
          title={title}
          actionLabel={t('common.seeAll')}
          onAction={() => router.push('/explore')}
        />
      </View>
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

/** Today's pickup, when there is one: the one dark block on the screen. */
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
    <View style={styles.pad}>
      <Banner
        tone="inverse"
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
    <View style={styles.pad}>
      <Card onPress={() => router.push('/impact')} accessibilityLabel={t('home.impact')}>
        <View style={styles.impactHeader}>
          <AppText variant="title2" style={styles.flex}>
            {t('home.impact')}
          </AppText>
          <Icon name="chevron-forward" size={18} color={colors.iconMuted} />
        </View>
        <View style={styles.impactRow}>
          <View style={styles.flex}>
            <AppText variant="title1">{impact.data.itemsRescued}</AppText>
            <AppText variant="footnote" color={colors.textSecondary}>
              {t('impact.items')}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="title1" color={colors.accent}>
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
          <DemoBadge />
          <IconButton
            icon="search-outline"
            accessibilityLabel={t('home.searchA11y')}
            onPress={() => router.push('/search')}
          />
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={feed.isRefetching} onRefresh={() => void feed.refetch()} />
        }
      >
        <View style={styles.pad}>
          <Pressable
            onPress={() => router.push('/search')}
            accessibilityRole="search"
            accessibilityLabel={t('home.searchA11y')}
            accessibilityHint={t('search.placeholder')}
            style={({ pressed }) => [styles.searchField, pressed && styles.pressed]}
          >
            <Icon name="search-outline" size={20} color={colors.textPrimary} />
            <AppText variant="body" color={colors.textSecondary} numberOfLines={1}>
              {t('search.placeholder')}
            </AppText>
          </Pressable>
        </View>

        <ActiveOrderBanner />

        {feed.isPending ? (
          <View style={styles.block}>
            <View style={styles.chipRow}>
              <Skeleton height={36} width={90} rounded={radius.pill} />
              <Skeleton height={36} width={90} rounded={radius.pill} />
              <Skeleton height={36} width={90} rounded={radius.pill} />
            </View>
            <View style={styles.pad}>
              <Skeleton height={28} width="55%" />
            </View>
            <View style={styles.rail}>
              <Skeleton height={250} width={RAIL_CARD_WIDTH} rounded={radius.lg} />
              <Skeleton height={250} width={RAIL_CARD_WIDTH} rounded={radius.lg} />
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
            {feed.data.categories.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
                accessibilityLabel={t('home.categories')}
              >
                {feed.data.categories.map((c) => (
                  <Chip key={c.id} label={c.name} onPress={() => openCategory(c.id)} />
                ))}
              </ScrollView>
            ) : null}
            <OfferRail title={t('home.nearby')} offers={feed.data.nearby} />
            <OfferRail title={t('home.pickupSoon')} offers={feed.data.pickupSoon} />
            <OfferRail title={t('home.favorites')} offers={feed.data.favoritesAvailable} />
            {feed.data.newStores.length > 0 ? (
              <View style={[styles.pad, styles.stores]}>
                <SectionHeader title={t('home.newStores')} />
                <View>
                  {feed.data.newStores.map((s, index) => (
                    <Fragment key={s.id}>
                      {index > 0 ? <Divider /> : null}
                      <StoreRow store={s} />
                    </Fragment>
                  ))}
                </View>
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
    paddingStart: spacing.lg,
    paddingEnd: spacing.sm,
    gap: spacing.sm,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  content: { paddingTop: spacing.xs, paddingBottom: spacing.huge, gap: spacing.xxxl },
  pad: { paddingHorizontal: spacing.lg },
  block: { gap: spacing.md },
  searchField: {
    minHeight: CONTROL_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: colors.bgSurfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pressed: { opacity: 0.7 },
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  rail: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg },
  stores: { gap: spacing.xs },
  impactHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  impactRow: { flexDirection: 'row', gap: spacing.lg },
  flex: { flex: 1 },
});
