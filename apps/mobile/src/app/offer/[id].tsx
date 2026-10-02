import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useOffer, useStore } from '@/api/hooks';
import { FavoriteButton } from '@/components/FavoriteButton';
import { OfferImage } from '@/components/OfferImage';
import { PickupWindowText, PriceTag, usePickupLabel } from '@/components/Price';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card, Screen } from '@/components/ui/Layout';
import { ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { colors, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { openDirections } from '@/lib/directions';
import { formatDistance, formatMoney, pickupPhase, savingsOf } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { useLocationStore } from '@/state/location';
import { useSession } from '@/state/session';

export default function OfferScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
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

  if (offer.isPending) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <ListSkeleton rows={3} rowHeight={160} />
      </Screen>
    );
  }
  if (offer.isError) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <ErrorState
          error={offer.error}
          onRetry={() => void offer.refetch()}
          retrying={offer.isRefetching}
        />
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
      {unavailableReason ? (
        <AppText variant="subhead" color={colors.textSecondary} align="center">
          {unavailableReason}
        </AppText>
      ) : (
        <AppText variant="subhead" color={colors.textSecondary} align="center">
          {pickupLabel}
        </AppText>
      )}
      <Button
        label={
          available
            ? t('offer.rescueCtaPrice', { price: formatMoney(o.price, locale) })
            : t('offer.unavailable')
        }
        disabled={!available}
        fullWidth
        accessibilityHint={pickupLabel}
        onPress={() =>
          signedIn
            ? router.push({ pathname: '/checkout/[offerId]', params: { offerId: o.id } })
            : router.push('/sign-in')
        }
      />
    </View>
  );

  return (
    <Screen scroll footer={footer} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: o.store.name,
          headerRight: () => (
            <FavoriteButton storeId={o.store.id} isFavorite={store.data?.isFavorite ?? false} />
          ),
        }}
      />
      <OfferImage image={o.image} size="large" height={220} accessibilityLabel={o.title} />

      <View style={styles.pad}>
        <View style={styles.badges}>
          {soldOut ? <Badge label={t('offer.soldOut')} tone="neutral" /> : null}
          {available ? (
            <Badge label={t('offer.left', { count: o.quantityAvailable })} tone="accent" />
          ) : null}
          {o.rating ? (
            <Badge label={`★ ${o.rating.average.toFixed(1)} (${o.rating.count})`} tone="neutral" />
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
        <Card>
          <PriceTag price={o.price} referenceValue={o.referenceValue} size="lg" />
          {savings ? (
            <AppText variant="subhead" color={colors.successFg}>
              {t('offer.youSave', { amount: formatMoney(savings, locale) })}
            </AppText>
          ) : null}
          <AppText variant="footnote" color={colors.textSecondary}>
            {t('offer.maxPerOrder', { count: o.maxPerOrder })}
          </AppText>
        </Card>
      </View>

      <View style={styles.pad}>
        <Card>
          <AppText variant="headline">{t('offer.pickup')}</AppText>
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
        </Card>
      </View>

      <View style={styles.pad}>
        <AppText variant="headline">{t('offer.description')}</AppText>
        <AppText variant="body">{o.description}</AppText>
        <AppText variant="footnote" color={colors.textSecondary}>
          {o.contentsNote ?? t('offer.contentsVary')}
        </AppText>
      </View>

      <View style={styles.pad}>
        <AppText variant="headline">{t('offer.allergens')}</AppText>
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
            <AppText variant="headline" style={styles.subheading}>
              {t('offer.dietary')}
            </AppText>
            <View style={styles.badges}>
              {o.dietaryTags.map((d) => (
                <Badge key={d} label={t(`dietary.${d}`)} tone="success" />
              ))}
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.pad}>
        <Card
          onPress={() => router.push({ pathname: '/store/[id]', params: { id: o.store.id } })}
          accessibilityLabel={t('offer.store')}
        >
          <AppText variant="headline">{t('offer.store')}</AppText>
          <AppText variant="body">{o.storeDetail.name}</AppText>
          {o.storeDetail.description ? (
            <AppText variant="subhead" color={colors.textSecondary}>
              {o.storeDetail.description}
            </AppText>
          ) : null}
        </Card>
      </View>

      <View style={styles.pad}>
        <AppText variant="headline">{t('offer.terms')}</AppText>
        <AppText variant="footnote" color={colors.textSecondary}>
          {o.terms}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 0, gap: spacing.xl },
  pad: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  subheading: { marginTop: spacing.md },
  footer: { gap: spacing.sm },
});
