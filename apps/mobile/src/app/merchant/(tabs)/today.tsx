import type { MerchantOrder } from '@mazal/contracts';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useMerchantOrders } from '@/api/merchantHooks';
import { PickupWindowText } from '@/components/Price';
import { DemoBadge, OrderStatusBadge } from '@/components/StatusBadges';
import { TabHeader } from '@/components/TabHeader';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Divider, Screen } from '@/components/ui/Layout';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { colors, spacing } from '@/design/tokens';
import { useMerchantContext } from '@/state/merchantContext';

function PickupRow({ order }: { order: MerchantOrder }) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${order.shortCode}. ${order.quantity}× ${order.offerTitle}`}
    >
      <View style={styles.flex}>
        <AppText variant="headline">
          {order.quantity}× {order.offerTitle}
        </AppText>
        <AppText variant="subhead" color={colors.textSecondary}>
          {order.customerInitial} · {order.shortCode}
        </AppText>
        <PickupWindowText window={order.pickup} />
      </View>
      <OrderStatusBadge status={order.status} />
    </View>
  );
}

export default function TodayScreen() {
  const { t } = useTranslation();
  const { context } = useMerchantContext();
  const orders = useMerchantOrders(context?.location?.id);
  const open = orders.data?.filter((o) => o.status !== 'PICKED_UP') ?? [];
  const collected = orders.data?.filter((o) => o.status === 'PICKED_UP') ?? [];

  let body;
  if (orders.isPending) body = <ListSkeleton rows={3} rowHeight={88} />;
  else if (orders.isError) {
    body = (
      <ErrorState
        error={orders.error}
        onRetry={() => void orders.refetch()}
        retrying={orders.isRefetching}
      />
    );
  } else if (orders.data.length === 0) {
    body = <EmptyState icon="today-outline" title={t('merchant.noPickups')} />;
  } else {
    body = (
      <FlashList
        data={[...open, ...collected]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <PickupRow order={item} />
          </View>
        )}
        ItemSeparatorComponent={RowSeparator}
        refreshing={orders.isRefetching}
        onRefresh={() => void orders.refetch()}
      />
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <TabHeader title={t('merchant.todayTitle')} right={<DemoBadge />} />
      <View style={styles.summary}>
        {context && context.business.status !== 'ACTIVE' ? (
          <Banner
            tone="warning"
            icon="hourglass-outline"
            title={t('merchant.pendingReviewTitle')}
            message={t('merchant.pendingReviewBody')}
          />
        ) : null}
        <AppText variant="subhead" color={colors.textSecondary}>
          {context?.location?.name ?? ''} · {t('merchant.pickups', { count: open.length })}
        </AppText>
        <Button
          label={t('merchant.scanCta')}
          icon="scan-outline"
          onPress={() => router.push('/merchant/scan')}
          fullWidth
        />
      </View>
      <View style={styles.flex}>{body}</View>
    </Screen>
  );
}

function RowSeparator() {
  return (
    <View style={styles.separator}>
      <Divider />
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.md },
  flex: { flex: 1 },
  item: { paddingHorizontal: spacing.lg },
  separator: { paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
});
