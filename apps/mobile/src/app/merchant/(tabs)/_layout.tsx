import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Layout';
import { ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { tabIcon } from '@/components/TabBarIcon';
import { tabScreenOptions } from '@/design/navigation';
import { useMerchantContext } from '@/state/merchantContext';
import { isMerchant, useSession } from '@/state/session';

/** Merchant mode. The server enforces permissions; this only shapes the UI per role. */
export default function MerchantTabs() {
  const { t } = useTranslation();
  const { status, me } = useSession();
  const merchant = useMerchantContext();

  if (status === 'loading') {
    return (
      <Screen edges={['top']}>
        <ListSkeleton />
      </Screen>
    );
  }
  if (status === 'signedOut') return <Redirect href="/sign-in" />;
  if (!isMerchant(me)) return <Redirect href="/merchant/apply" />;
  if (merchant.isPending) {
    return (
      <Screen edges={['top']}>
        <ListSkeleton />
      </Screen>
    );
  }
  if (merchant.isError || !merchant.context) {
    return (
      <Screen edges={['top']}>
        <ErrorState
          error={merchant.error}
          onRetry={() => void merchant.refetch()}
          retrying={merchant.isRefetching}
        />
      </Screen>
    );
  }

  const ownerOnly = merchant.context.role === 'OWNER' ? undefined : null;

  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="today"
        options={{ title: t('tabs.today'), tabBarIcon: tabIcon('today', 'today-outline') }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: t('tabs.offers'),
          tabBarIcon: tabIcon('pricetag', 'pricetag-outline'),
          href: ownerOnly,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: t('tabs.scan'), tabBarIcon: tabIcon('scan', 'scan-outline') }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: t('tabs.insights'),
          tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline'),
          href: ownerOnly,
        }}
      />
      <Tabs.Screen
        name="business"
        options={{
          title: t('tabs.business'),
          tabBarIcon: tabIcon('storefront', 'storefront-outline'),
        }}
      />
    </Tabs>
  );
}
