import type { Money, PickupWindow } from '@mawjood/contracts';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { formatMoney, pickupPhase, pickupWindowParts } from '@/lib/format';
import { useNow } from '@/lib/useNow';

import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

type PriceTagProps = { price: Money; referenceValue: Money | null; size?: 'md' | 'lg' };

/** Price first; legitimate reference value as text ("usually …"), never only a strikethrough. */
export function PriceTag({ price, referenceValue, size = 'md' }: PriceTagProps) {
  const { t } = useTranslation();
  const locale = currentLocale();
  const priceText = formatMoney(price, locale);
  const referenceText = referenceValue ? formatMoney(referenceValue, locale) : null;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={
        referenceText
          ? t('offer.priceA11y', { price: priceText, reference: referenceText })
          : priceText
      }
    >
      <AppText variant={size === 'lg' ? 'title2' : 'headline'} color={colors.textBrand}>
        {priceText}
      </AppText>
      {referenceText ? (
        <AppText variant="footnote" color={colors.textSecondary}>
          {t('offer.usually', { amount: referenceText })}
        </AppText>
      ) : null}
    </View>
  );
}

export function usePickupLabel(window: PickupWindow): string {
  const { t } = useTranslation();
  const now = useNow();
  const parts = pickupWindowParts(window, now, currentLocale());
  const vars = { start: parts.start, end: parts.end, date: parts.dateLabel };
  switch (parts.day) {
    case 'today':
      return t('pickup.today', vars);
    case 'tomorrow':
      return t('pickup.tomorrow', vars);
    case 'yesterday':
      return t('pickup.yesterday', vars);
    default:
      return t('pickup.other', vars);
  }
}

export function PickupWindowText({
  window,
  showIcon = true,
}: {
  window: PickupWindow;
  showIcon?: boolean;
}) {
  const { t } = useTranslation();
  const label = usePickupLabel(window);
  const phase = pickupPhase(window, useNow());
  return (
    <View style={styles.row}>
      {showIcon ? <Icon name="time-outline" size={16} color={colors.icon} /> : null}
      <AppText variant="subhead" color={colors.textSecondary}>
        {label}
      </AppText>
      {phase === 'open' ? (
        <AppText variant="caption" color={colors.successFg}>
          · {t('pickup.openNow')}
        </AppText>
      ) : phase === 'ended' ? (
        <AppText variant="caption" color={colors.textSecondary}>
          · {t('pickup.ended')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
});
