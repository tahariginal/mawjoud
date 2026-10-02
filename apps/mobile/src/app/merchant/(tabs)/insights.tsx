import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useMerchantInsights } from '@/api/merchantHooks';
import { TabHeader } from '@/components/TabHeader';
import { AppText } from '@/components/ui/AppText';
import { Card, Screen, Sections } from '@/components/ui/Layout';
import { ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { colors, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { useMerchantContext } from '@/state/merchantContext';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <AppText variant="title1">{value}</AppText>
      <AppText variant="subhead" color={colors.textSecondary}>
        {label}
      </AppText>
    </Card>
  );
}

export default function InsightsScreen() {
  const { t } = useTranslation();
  const { context } = useMerchantContext();
  const insights = useMerchantInsights(context?.business.id);
  const locale = currentLocale();
  const percent = (value: number | null) =>
    value === null
      ? t('merchant.notEnoughData')
      : new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(value);

  let body;
  if (insights.isPending) body = <ListSkeleton rows={4} rowHeight={88} />;
  else if (insights.isError) {
    body = (
      <ErrorState
        error={insights.error}
        onRetry={() => void insights.refetch()}
        retrying={insights.isRefetching}
      />
    );
  } else {
    const d = insights.data;
    body = (
      <View style={styles.list}>
        <AppText variant="subhead" color={colors.textSecondary}>
          {t('merchant.insightsPeriod')}
        </AppText>
        <Sections>
          <Metric label={t('merchant.revenue')} value={formatMoney(d.revenue, locale)} />
          <Metric label={t('merchant.ordersCompleted')} value={String(d.ordersCompleted)} />
          <Metric label={t('merchant.itemsRescued')} value={String(d.itemsRescued)} />
          <Metric label={t('merchant.sellThrough')} value={percent(d.sellThroughRate)} />
          <Metric label={t('merchant.noShowRate')} value={percent(d.noShowRate)} />
        </Sections>
      </View>
    );
  }

  return (
    <Screen scroll edges={['top', 'left', 'right']} contentContainerStyle={styles.content}>
      <TabHeader title={t('merchant.insightsTitle')} />
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 0, gap: spacing.md },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md },
});
