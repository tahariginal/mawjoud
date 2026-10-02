import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { useCancelOrder, useOrder } from '@/api/hooks';
import { PickupWindowText } from '@/components/Price';
import { QRPass } from '@/components/QRPass';
import { OrderStatusBadge } from '@/components/StatusBadges';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card, Divider, Screen } from '@/components/ui/Layout';
import { ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { colors, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { openDirections } from '@/lib/directions';
import { formatMoney, formatShortDate, formatTime } from '@/lib/format';
import { useErrorMessage } from '@/lib/useErrorMessage';

export default function OrderScreen() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useOrder(id, { pollWhilePending: true });
  const cancel = useCancelOrder(id);
  const locale = currentLocale();

  if (order.isPending) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('orders.detailTitle') }} />
        <ListSkeleton rows={3} />
      </Screen>
    );
  }
  if (order.isError) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('orders.detailTitle') }} />
        <ErrorState
          error={order.error}
          onRetry={() => void order.refetch()}
          retrying={order.isRefetching}
        />
      </Screen>
    );
  }

  const o = order.data;
  const collectable = (o.status === 'CONFIRMED' || o.status === 'READY_FOR_PICKUP') && o.pickupPass;

  const confirmCancel = () =>
    Alert.alert(t('orders.cancelConfirmTitle'), t('orders.cancelConfirmBody'), [
      { text: t('orders.cancelKeep'), style: 'cancel' },
      { text: t('orders.cancel'), style: 'destructive', onPress: () => cancel.mutate({}) },
    ]);

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: t('orders.detailTitle') }} />

      <View style={styles.header}>
        <OrderStatusBadge status={o.status} />
        <AppText variant="title2">{o.store.name}</AppText>
        <PickupWindowText window={o.pickup} />
      </View>

      {cancel.isError ? <Banner tone="error" message={errorMessage(cancel.error)} /> : null}

      {collectable && o.pickupPass ? (
        <QRPass pass={o.pickupPass} storeName={o.store.name} />
      ) : o.status === 'PAYMENT_PENDING' || o.status === 'CREATED' ? (
        <Card>
          <AppText variant="body">{t('orders.passNotYet')}</AppText>
          <Button
            label={t('orders.completePayment')}
            onPress={() =>
              router.push({ pathname: '/payment/[orderId]', params: { orderId: o.id } })
            }
          />
        </Card>
      ) : null}

      {o.pickedUpAt ? (
        <Banner
          tone="success"
          message={t('orders.pickedUpAt', {
            time: `${formatShortDate(new Date(o.pickedUpAt), o.pickup.timezone, locale)} ${formatTime(new Date(o.pickedUpAt), o.pickup.timezone, locale)}`,
          })}
        />
      ) : null}

      <Card>
        <AppText variant="headline">{t('offer.pickup')}</AppText>
        <AppText variant="subhead">
          {o.store.address.line1}, {o.store.address.city}
        </AppText>
        <Button
          label={t('offer.directions')}
          icon="navigate-outline"
          variant="secondary"
          onPress={() => void openDirections(o.store.location, o.store.name)}
        />
      </Card>

      <Card>
        <AppText variant="headline">{t('orders.items')}</AppText>
        {o.items.map((item) => (
          <View key={item.offerId} style={styles.line}>
            <AppText variant="subhead" style={styles.flex}>
              {item.quantity}× {item.title}
            </AppText>
            <AppText variant="subhead">
              {formatMoney(
                { ...item.unitPrice, amountMinor: item.unitPrice.amountMinor * item.quantity },
                locale,
              )}
            </AppText>
          </View>
        ))}
        <Divider />
        <View style={styles.line}>
          <AppText variant="headline" style={styles.flex}>
            {t('orders.total')}
          </AppText>
          <AppText variant="headline">{formatMoney(o.breakdown.total, locale)}</AppText>
        </View>
        {o.payment?.refunded ? (
          <AppText variant="subhead" color={colors.successFg}>
            {t('orders.refunded', { amount: formatMoney(o.payment.refunded, locale) })}
          </AppText>
        ) : null}
        <AppText variant="footnote" color={colors.textSecondary} selectable>
          {t('orders.reference')}: {o.shortCode}
        </AppText>
      </Card>

      <View style={styles.actions}>
        {o.reviewable ? (
          <Button
            label={t('orders.review')}
            icon="star"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/review/[orderId]', params: { orderId: o.id } })
            }
            fullWidth
          />
        ) : null}
        {o.cancellable ? (
          <Button
            label={t('orders.cancel')}
            variant="destructive"
            loading={cancel.isPending}
            onPress={confirmCancel}
            fullWidth
          />
        ) : null}
        <Button
          label={t('orders.help')}
          variant="tertiary"
          onPress={() => router.push('/help')}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  line: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  flex: { flex: 1 },
  actions: { gap: spacing.md },
});
