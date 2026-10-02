import type { OfferSummary } from '@mawjood/contracts';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { formatDistance, pickupPhase } from '@/lib/format';
import { useNow } from '@/lib/useNow';

import { PriceTag, usePickupLabel } from './Price';
import { OfferImage } from './OfferImage';
import { AppText } from './ui/AppText';
import { Badge } from './ui/Badge';

type Props = { offer: OfferSummary; variant?: 'rail' | 'list' };

const IMAGE_HEIGHT = { rail: 160, list: 180 } as const;

/**
 * Photo first, then plain text — no card box. Priority: what → where → when → how much
 * (docs/UX_SPECIFICATION.md §3.2).
 */
export function OfferCard({ offer, variant = 'list' }: Props) {
  const { t } = useTranslation();
  const locale = currentLocale();
  const pickupLabel = usePickupLabel(offer.pickup);
  const phase = pickupPhase(offer.pickup, useNow());
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
      style={({ pressed }) => [variant === 'rail' && styles.rail, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        <View style={soldOut && styles.dimmed}>
          <OfferImage
            image={offer.image}
            size={variant === 'rail' ? 'thumb' : 'medium'}
            height={IMAGE_HEIGHT[variant]}
            categoryId={offer.categoryId}
            storeName={offer.store.name}
          />
        </View>
        <View style={styles.badge}>
          {soldOut ? (
            <Badge label={t('offer.soldOut')} tone="onImage" />
          ) : offer.quantityAvailable <= 3 ? (
            <Badge label={t('offer.left', { count: offer.quantityAvailable })} tone="onImage" />
          ) : null}
        </View>
      </View>
      <View style={styles.body}>
        <AppText variant="subhead" color={colors.textSecondary} numberOfLines={1}>
          {offer.store.name}
        </AppText>
        <AppText variant="headline" numberOfLines={1}>
          {offer.title}
        </AppText>
        <AppText variant="subhead" color={colors.textSecondary} numberOfLines={1}>
          {distance ? `${distance} · ` : ''}
          {pickupLabel}
          {phase === 'open' ? (
            <AppText variant="subhead" color={colors.accent}>
              {` · ${t('pickup.openNow')}`}
            </AppText>
          ) : phase === 'ended' ? (
            ` · ${t('pickup.ended')}`
          ) : null}
        </AppText>
        <View style={styles.price}>
          <PriceTag price={offer.price} referenceValue={offer.referenceValue} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rail: { width: 280 },
  pressed: { opacity: 0.7 },
  imageWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  dimmed: { opacity: 0.5 },
  badge: { position: 'absolute', top: spacing.sm, start: spacing.sm },
  body: { paddingTop: spacing.sm, gap: spacing.xxs },
  price: { paddingTop: spacing.xs },
});
