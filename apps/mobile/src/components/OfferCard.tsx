import type { OfferSummary } from '@mawjood/contracts';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, elevation, radius, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { formatDistance } from '@/lib/format';

import { PickupWindowText, PriceTag, usePickupLabel } from './Price';
import { OfferImage } from './OfferImage';
import { AppText } from './ui/AppText';
import { Badge } from './ui/Badge';

type Props = { offer: OfferSummary; variant?: 'rail' | 'list' };

/** Priority: what → where → when → how much (docs/UX_SPECIFICATION.md §3.2). */
export function OfferCard({ offer, variant = 'list' }: Props) {
  const { t } = useTranslation();
  const locale = currentLocale();
  const pickupLabel = usePickupLabel(offer.pickup);
  const soldOut = offer.status === 'SOLD_OUT' || offer.quantityAvailable === 0;
  const distance = offer.distanceM !== null ? formatDistance(offer.distanceM, locale) : null;

  const a11yLabel = [
    offer.store.name,
    offer.title,
    distance,
    pickupLabel,
    soldOut ? t('offer.soldOut') : t('offer.left', { count: offer.quantityAvailable }),
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/offer/[id]', params: { id: offer.id } })}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [
        styles.card,
        variant === 'rail' && styles.rail,
        pressed && styles.pressed,
      ]}
    >
      <View>
        <OfferImage
          image={offer.image}
          size={variant === 'rail' ? 'thumb' : 'medium'}
          height={variant === 'rail' ? 110 : 140}
        />
        <View style={styles.badge}>
          {soldOut ? (
            <Badge label={t('offer.soldOut')} tone="neutral" />
          ) : offer.quantityAvailable <= 3 ? (
            <Badge label={t('offer.left', { count: offer.quantityAvailable })} tone="accent" />
          ) : null}
        </View>
      </View>
      <View style={styles.body}>
        <AppText variant="subhead" color={colors.textSecondary} numberOfLines={1}>
          {offer.store.name}
        </AppText>
        <AppText variant="headline" numberOfLines={2}>
          {offer.title}
        </AppText>
        <View style={styles.meta}>
          {distance ? (
            <AppText variant="subhead" color={colors.textSecondary}>
              {distance} ·
            </AppText>
          ) : null}
          <PickupWindowText window={offer.pickup} showIcon={false} />
        </View>
        <PriceTag price={offer.price} referenceValue={offer.referenceValue} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...elevation.card,
  },
  rail: { width: 260 },
  pressed: { opacity: 0.9 },
  badge: { position: 'absolute', top: spacing.sm, start: spacing.sm },
  body: { padding: spacing.md, gap: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
});
