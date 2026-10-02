import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useImpact } from '@/api/hooks';
import { SignInPrompt } from '@/components/SignInPrompt';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Card, Screen } from '@/components/ui/Layout';
import { ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { colors, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { useSession } from '@/state/session';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <AppText variant="display" color={colors.textPrimary}>
        {value}
      </AppText>
      <AppText variant="subhead" color={colors.textSecondary}>
        {label}
      </AppText>
    </Card>
  );
}

export default function ImpactScreen() {
  const { t } = useTranslation();
  const status = useSession((s) => s.status);
  const impact = useImpact();
  const locale = currentLocale();
  const title = <Stack.Screen options={{ title: t('impact.title') }} />;

  if (status === 'signedOut') {
    return (
      <Screen>
        {title}
        <SignInPrompt icon="leaf-outline" title={t('impact.title')} body={t('profile.guestBody')} />
      </Screen>
    );
  }
  if (impact.isPending) {
    return (
      <Screen>
        {title}
        <ListSkeleton rows={3} />
      </Screen>
    );
  }
  if (impact.isError) {
    return (
      <Screen>
        {title}
        <ErrorState
          error={impact.error}
          onRetry={() => void impact.refetch()}
          retrying={impact.isRefetching}
        />
      </Screen>
    );
  }

  const d = impact.data;
  return (
    <Screen scroll>
      {title}
      <View style={styles.grid}>
        <Metric label={t('impact.orders')} value={String(d.ordersCompleted)} />
        <Metric label={t('impact.items')} value={String(d.itemsRescued)} />
        <Metric label={t('impact.moneySaved')} value={formatMoney(d.moneySaved, locale)} />
        <Metric
          label={t('impact.co2')}
          value={
            d.co2eKg === null
              ? t('impact.co2Pending')
              : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(d.co2eKg)} kg`
          }
        />
      </View>
      <AppText variant="footnote" color={colors.textSecondary}>
        {t('impact.howCalculated')}
      </AppText>
      {d.methodology === null ? (
        <Banner tone="info" message={t('impact.methodologyPending')} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.md },
});
