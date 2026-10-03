import type { Order } from '@mazal/contracts';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { formatMoney } from '@/lib/format';

import { PickupWindowText } from './Price';
import { OrderStatusBadge } from './StatusBadges';
import { Thumbnail } from './Thumbnail';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

/** Thumbnail, store and status, items and total, pickup window, chevron. No card. */
export function OrderRow({ order }: { order: Order }) {
  const title = order.items.map((i) => `${i.quantity}× ${i.title}`).join(', ');
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${order.store.name}. ${title}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Thumbnail name={order.store.name} />
      <View style={styles.text}>
        <View style={styles.top}>
          <AppText variant="headline" numberOfLines={1} style={styles.flex}>
            {order.store.name}
          </AppText>
          <OrderStatusBadge status={order.status} />
        </View>
        <AppText variant="subhead" color={colors.textSecondary} numberOfLines={1}>
          {formatMoney(order.breakdown.total, currentLocale())} · {title}
        </AppText>
        <PickupWindowText window={order.pickup} showIcon={false} />
      </View>
      <Icon name="chevron-forward" size={18} color={colors.iconMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.6 },
  text: { flex: 1, gap: spacing.xxs },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
