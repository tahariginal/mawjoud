import type { OrdersScope } from '@mawjood/contracts';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useOrders } from '@/api/hooks';
import { OrderRow } from '@/components/OrderRow';
import { SignInPrompt } from '@/components/SignInPrompt';
import { TabHeader } from '@/components/TabHeader';
import { Screen } from '@/components/ui/Layout';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { spacing } from '@/design/tokens';
import { useSession } from '@/state/session';

function OrdersList({ scope }: { scope: OrdersScope }) {
  const { t } = useTranslation();
  const orders = useOrders(scope);
  if (orders.isPending) return <ListSkeleton rows={3} />;
  if (orders.isError) {
    return (
      <ErrorState
        error={orders.error}
        onRetry={() => void orders.refetch()}
        retrying={orders.isRefetching}
      />
    );
  }
  if (orders.data.data.length === 0) {
    return scope === 'upcoming' ? (
      <EmptyState
        icon="receipt-outline"
        title={t('orders.emptyUpcoming')}
        body={t('orders.emptyUpcomingBody')}
        actionLabel={t('orders.findFood')}
        onAction={() => router.push('/home')}
      />
    ) : (
      <EmptyState icon="time-outline" title={t('orders.emptyPast')} />
    );
  }
  return (
    <FlashList
      data={orders.data.data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <OrderRow order={item} />
        </View>
      )}
      refreshing={orders.isRefetching}
      onRefresh={() => void orders.refetch()}
    />
  );
}

export default function OrdersScreen() {
  const { t } = useTranslation();
  const status = useSession((s) => s.status);
  const [scope, setScope] = useState<OrdersScope>('upcoming');

  return (
    <Screen edges={['top', 'left', 'right']}>
      <TabHeader title={t('tabs.orders')} />
      {status === 'signedOut' ? (
        <SignInPrompt
          icon="receipt-outline"
          title={t('orders.signInTitle')}
          body={t('orders.signInBody')}
        />
      ) : status === 'loading' ? (
        <ListSkeleton rows={3} />
      ) : (
        <>
          <View style={styles.controls}>
            <SegmentedControl
              options={[
                { value: 'upcoming', label: t('orders.upcoming') },
                { value: 'past', label: t('orders.past') },
              ]}
              value={scope}
              onChange={setScope}
            />
          </View>
          <View style={styles.flex}>
            <OrdersList scope={scope} />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  flex: { flex: 1 },
  item: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
});
