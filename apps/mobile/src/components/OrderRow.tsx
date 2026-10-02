import type { Order } from '@mawjood/contracts';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, elevation, radius, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { formatMoney } from '@/lib/format';

import { PickupWindowText } from './Price';
import { OrderStatusBadge } from './StatusBadges';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

export function OrderRow({ order }: { order: Order }) {
  const title = order.items.map((i) => `${i.quantity}× ${i.title}`).join(', ');
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${order.store.name}. ${title}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <AppText variant="headline" numberOfLines={1} style={styles.flex}>
          {order.store.name}
        </AppText>
        <OrderStatusBadge status={order.status} />
      </View>
      <AppText variant="subhead" numberOfLines={2}>
        {title}
      </AppText>
      <View style={styles.bottom}>
        <View style={styles.flex}>
          <PickupWindowText window={order.pickup} />
        </View>
        <AppText variant="subhead" weight="semibold">
          {formatMoney(order.breakdown.total, currentLocale())}
        </AppText>
        <Icon name="chevron-forward" size={18} color={colors.iconMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...elevation.card,
  },
  pressed: { opacity: 0.9 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
