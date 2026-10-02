import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOffer, useStore } from '@/api/hooks';
import { FavoriteButton } from '@/components/FavoriteButton';
import { OfferImage } from '@/components/OfferImage';
import { PickupWindowText, PriceTag, usePickupLabel } from '@/components/Price';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Divider, Screen } from '@/components/ui/Layout';
import { ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { colors, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { openDirections } from '@/lib/directions';
import { formatDistance, formatMoney, pickupPhase, savingsOf } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { useLocationStore } from '@/state/location';
import { useSession } from '@/state/session';

const IMAGE_HEIGHT = 280;

/**
 * Round white buttons floating over the full-bleed image. The native header is hidden so the
 * image reaches the top edge; these stay fixed while the content scrolls.
 */
function FloatingBar({ right }: { right?: ReactNode }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.floatingBar, { top: insets.top + spacing.xs }]} pointerEvents="box-none">
      <IconButton
        icon="chevron-back"
        background
        accessibilityLabel={t('common.back')}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
      />
      {right}
    </View>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <View style={styles.section}>{children}</View>;
}

export default function OfferScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const point = useLocationStore((s) => s.selected.point);
  const offer = useOffer(id, point);
  const storeId = offer.data?.store.id ?? '';
  const store = useStore(storeId, point);
  const signedIn = useSession((s) => s.status === 'signedIn');
  const now = useNow();
  const locale = currentLocale();
  const pickupLabel = usePickupLabel(
    offer.data?.pickup ?? { start: now.toISOString(), end: now.toISOString(), timezone: 'UTC' },
  );
  const header = <Stack.Screen options={{ headerShown: false, title: offer.data?.store.name }} />;

  if (offer.isPending) {
    return (
      <Screen>
        {header}
        <View style={{ paddingTop: insets.top + spacing.giant + spacing.sm }}>
          <ListSkeleton rows={3} rowHeight={160} />
        </View>
        <FloatingBar />
      </Screen>
    );
  }

  if (offer.isError) {
    return (
      <Screen>
        {header}
        <View style={[styles.flex, { paddingTop: insets.top + spacing.giant }]}>
          <ErrorState
            error={offer.error}
            onRetry={() => void offer.refetch()}
            retrying={offer.isRefetching}
          />
        </View>
        <FloatingBar />
      </Screen>
    );
  }

  const o = offer.data;
  const ended =
    o.status === 'ENDED' || o.status === 'REMOVED' || pickupPhase(o.pickup, now) === 'ended';
  const soldOut = !ended && (o.status === 'SOLD_OUT' || o.quantityAvailable === 0);
  const paused = o.status === 'PAUSED';
  const available = !ended && !soldOut && !paused;
  const savings = savingsOf(o.price, o.referenceValue);
  const unavailableReason = ended
    ? t('offer.ended')
    : soldOut
      ? t('errors.soldOut')
      : paused
        ? t('offer.paused')
        : null;

  const footer = (
    <View style={styles.footer}>
      <View style={styles.footerText}>
        {unavailableReason ? (
          <AppText variant="subhead" color={colors.textSecondary} numberOfLines={2}>
            {unavailableReason}
          </AppText>
        ) : (
          <>
            <AppText variant="title2">{formatMoney(o.price, locale)}</AppText>
            <AppText variant="footnote" color={colors.textSecondary} numberOfLines={1}>
              {pickupLabel}
            </AppText>
          </>
        )}
      </View>
      <Button
        label={available ? t('offer.reserve') : t('offer.unavailable')}
        disabled={!available}
        fullWidth={false}
        accessibilityHint={pickupLabel}
        onPress={() =>
          signedIn
            ? router.push({ pathname: '/checkout/[offerId]', params: { offerId: o.id } })
            : router.push('/sign-in')
        }
      />
    </View>
  );

  const sections: ReactNode[] = [
    <Section key="price">
      <PriceTag price={o.price} referenceValue={o.referenceValue} size="lg" />
      {savings ? (
        <AppText variant="subhead" color={colors.successFg}>
          {t('offer.youSave', { amount: formatMoney(savings, locale) })}
        </AppText>
      ) : null}
      <AppText variant="footnote" color={colors.textSecondary}>
        {t('offer.maxPerOrder', { count: o.maxPerOrder })}
      </AppText>
    </Section>,
    <Section key="pickup">
      <AppText variant="headline" accessibilityRole="header">
        {t('offer.pickup')}
      </AppText>
      <PickupWindowText window={o.pickup} />
      <AppText variant="subhead">
        {o.storeDetail.address.line1}, {o.storeDetail.address.city}
      </AppText>
      <Button
        label={t('offer.directions')}
        icon="navigate-outline"
        variant="secondary"
        onPress={() => void openDirections(o.storeDetail.location, o.store.name)}
      />
    </Section>,
    <Section key="description">
      <AppText variant="headline" accessibilityRole="header">
        {t('offer.description')}
      </AppText>
      <AppText variant="body">{o.description}</AppText>
      <AppText variant="footnote" color={colors.textSecondary}>
        {o.contentsNote ?? t('offer.contentsVary')}
      </AppText>
    </Section>,
    <Section key="allergens">
      <AppText variant="headline" accessibilityRole="header">
        {t('offer.allergens')}
      </AppText>
      {o.allergens.length > 0 ? (
        <View style={styles.badges}>
          {o.allergens.map((a) => (
            <Badge key={a} label={t(`allergen.${a}`)} tone="warning" icon="warning-outline" />
          ))}
        </View>
      ) : (
        <AppText variant="subhead" color={colors.textSecondary}>
          {t('offer.allergensNone')}
        </AppText>
      )}
      {o.dietaryTags.length > 0 ? (
        <>
          <AppText variant="headline" accessibilityRole="header" style={styles.subheading}>
            {t('offer.dietary')}
          </AppText>
          <View style={styles.badges}>
            {o.dietaryTags.map((d) => (
              <Badge key={d} label={t(`dietary.${d}`)} tone="success" />
            ))}
          </View>
        </>
      ) : null}
    </Section>,
    <Pressable
      key="store"
      onPress={() => router.push({ pathname: '/store/[id]', params: { id: o.store.id } })}
      accessibilityRole="button"
      accessibilityLabel={t('offer.store')}
      style={({ pressed }) => [styles.storeRow, pressed && styles.pressed]}
    >
      <View style={styles.flex}>
        <AppText variant="headline">{t('offer.store')}</AppText>
        <AppText variant="body">{o.storeDetail.name}</AppText>
        {o.storeDetail.description ? (
          <AppText variant="subhead" color={colors.textSecondary}>
            {o.storeDetail.description}
          </AppText>
        ) : null}
      </View>
      <Icon name="chevron-forward" size={18} color={colors.iconMuted} />
    </Pressable>,
    <Section key="terms">
      <AppText variant="headline" accessibilityRole="header">
        {t('offer.terms')}
      </AppText>
      <AppText variant="footnote" color={colors.textSecondary}>
        {o.terms}
      </AppText>
    </Section>,
  ];

  return (
    <Screen footer={footer}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <OfferImage
          image={o.image}
          size="large"
          height={IMAGE_HEIGHT + insets.top}
          accessibilityLabel={o.title}
          categoryId={o.categoryId}
          storeName={o.store.name}
        />
        <View style={styles.titleBlock}>
          <View style={styles.badges}>
            {soldOut ? <Badge label={t('offer.soldOut')} tone="neutral" /> : null}
            {available ? (
              <Badge label={t('offer.left', { count: o.quantityAvailable })} tone="neutral" />
            ) : null}
            {o.rating ? (
              <Badge
                label={`★ ${o.rating.average.toFixed(1)} (${o.rating.count})`}
                tone="neutral"
              />
            ) : null}
          </View>
          <AppText variant="title1" accessibilityRole="header">
            {o.title}
          </AppText>
          <AppText variant="subhead" color={colors.textSecondary}>
            {o.store.name}
            {o.distanceM !== null
              ? ` · ${t('offer.away', { distance: formatDistance(o.distanceM, locale) })}`
              : ''}
          </AppText>
        </View>
        {unavailableReason ? (
          <View style={styles.pad}>
            <Banner tone="warning" message={unavailableReason} />
          </View>
        ) : null}
        <View style={styles.pad}>
          {sections.map((section, index) => (
            <Fragment key={index}>
              {index > 0 ? <Divider /> : null}
              {section}
            </Fragment>
          ))}
        </View>
      </ScrollView>
      <FloatingBar
        right={<FavoriteButton storeId={o.store.id} isFavorite={store.data?.isFavorite ?? false} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: spacing.huge, gap: spacing.xl },
  floatingBar: {
    position: 'absolute',
    start: spacing.lg,
    end: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleBlock: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  pad: { paddingHorizontal: spacing.lg },
  section: { gap: spacing.sm, paddingVertical: spacing.xl },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  pressed: { opacity: 0.6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  subheading: { marginTop: spacing.md },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  footerText: { flex: 1, gap: spacing.xxs },
});
