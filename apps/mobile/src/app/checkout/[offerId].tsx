import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { errorCodeOf } from '@/api';
import { useCreateOrder, useOffer, useQuote } from '@/api/hooks';
import { PickupWindowText } from '@/components/Price';
import { SignInPrompt } from '@/components/SignInPrompt';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card, Divider, Screen } from '@/components/ui/Layout';
import { EmptyState, ErrorState, ListSkeleton, Skeleton } from '@/components/ui/StateViews';
import { Stepper } from '@/components/ui/Stepper';
import { colors, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { checkoutKeyFor, clearCheckoutAttempt } from '@/state/checkoutKeys';
import { useLocationStore } from '@/state/location';
import { usePendingPayments } from '@/state/pendingPayments';
import { useSession } from '@/state/session';

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <AppText variant={strong ? 'headline' : 'subhead'} style={styles.flex}>
        {label}
      </AppText>
      <AppText variant={strong ? 'headline' : 'subhead'}>{value}</AppText>
    </View>
  );
}

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { offerId } = useLocalSearchParams<{ offerId: string }>();
  const { me, status } = useSession();
  const point = useLocationStore((s) => s.selected.point);
  const offer = useOffer(offerId, point);
  const [quantity, setQuantity] = useState(1);
  const canQuote = status === 'signedIn' && !!me?.emailVerified;
  const quote = useQuote(offerId, quantity, canQuote && offer.isSuccess);
  const createOrder = useCreateOrder();
  const setPending = usePendingPayments((s) => s.set);
  const locale = currentLocale();

  if (status === 'signedOut') {
    return (
      <Screen>
        <SignInPrompt
          icon="basket-outline"
          title={t('checkout.signInTitle')}
          body={t('checkout.signInBody')}
        />
      </Screen>
    );
  }
  if (status === 'signedIn' && me && !me.emailVerified) {
    return (
      <Screen>
        <EmptyState
          icon="mail-outline"
          title={t('checkout.verifyTitle')}
          body={t('checkout.verifyBody')}
          actionLabel={t('auth.verify')}
          onAction={() => router.push('/verify-email')}
        />
      </Screen>
    );
  }
  if (offer.isPending || status === 'loading') {
    return (
      <Screen>
        <ListSkeleton rows={3} />
      </Screen>
    );
  }
  if (offer.isError) {
    return (
      <Screen>
        <ErrorState
          error={offer.error}
          onRetry={() => void offer.refetch()}
          retrying={offer.isRefetching}
        />
      </Screen>
    );
  }

  const o = offer.data;
  const maxQuantity = Math.max(1, Math.min(o.maxPerOrder, o.quantityAvailable));
  const soldOutNow =
    errorCodeOf(createOrder.error) === 'OFFER_SOLD_OUT' ||
    errorCodeOf(quote.error) === 'OFFER_SOLD_OUT' ||
    o.quantityAvailable === 0;

  if (soldOutNow) {
    return (
      <Screen>
        <EmptyState
          icon="basket-outline"
          title={t('errors.soldOut')}
          actionLabel={t('orders.findFood')}
          onAction={() => {
            router.dismissAll();
            router.push('/explore');
          }}
        />
      </Screen>
    );
  }

  const pay = async () => {
    if (!quote.data || createOrder.isPending) return;
    const idempotencyKey = await checkoutKeyFor(o.id, quantity);
    createOrder.mutate(
      { offerId: o.id, quantity, quoteVersion: quote.data.quoteVersion, idempotencyKey },
      {
        onSuccess: async (result) => {
          await clearCheckoutAttempt();
          setPending(result.order.id, result.payment);
          router.dismissAll();
          router.push({ pathname: '/payment/[orderId]', params: { orderId: result.order.id } });
        },
        onError: (error) => {
          if (errorCodeOf(error) === 'PRICE_CHANGED') void quote.refetch();
        },
      },
    );
  };

  const total = quote.data ? formatMoney(quote.data.breakdown.total, locale) : null;

  const footer = (
    <Button
      label={total ? t('checkout.pay', { amount: total }) : t('checkout.calculating')}
      onPress={() => void pay()}
      loading={createOrder.isPending}
      disabled={!quote.data}
      icon="lock-closed-outline"
      fullWidth
    />
  );

  return (
    <Screen scroll footer={footer}>
      <View style={styles.header}>
        <AppText variant="title2">{o.title}</AppText>
        <AppText variant="subhead" color={colors.textSecondary}>
          {o.store.name}
        </AppText>
      </View>

      {createOrder.isError ? (
        <Banner tone="error" message={errorMessage(createOrder.error)} />
      ) : null}

      <Card>
        <Stepper
          label={t('checkout.quantity')}
          value={quantity}
          min={1}
          max={maxQuantity}
          onChange={setQuantity}
        />
        <AppText variant="footnote" color={colors.textSecondary}>
          {t('offer.maxPerOrder', { count: o.maxPerOrder })}
        </AppText>
      </Card>

      <Card>
        <AppText variant="headline">{t('checkout.pickup')}</AppText>
        <PickupWindowText window={o.pickup} />
        <AppText variant="subhead">
          {o.storeDetail.address.line1}, {o.storeDetail.address.city}
        </AppText>
      </Card>

      <Card>
        {quote.isPending ? (
          <Skeleton height={96} />
        ) : quote.isError ? (
          <ErrorState
            error={quote.error}
            onRetry={() => void quote.refetch()}
            retrying={quote.isRefetching}
          />
        ) : (
          <>
            <Line
              label={t('checkout.subtotal')}
              value={formatMoney(quote.data.breakdown.subtotal, locale)}
            />
            {quote.data.breakdown.fees.amountMinor > 0 ? (
              <Line
                label={t('checkout.fees')}
                value={formatMoney(quote.data.breakdown.fees, locale)}
              />
            ) : null}
            {quote.data.breakdown.tax.amountMinor > 0 ? (
              <Line
                label={t('checkout.tax')}
                value={formatMoney(quote.data.breakdown.tax, locale)}
              />
            ) : null}
            {quote.data.breakdown.discount.amountMinor > 0 ? (
              <Line
                label={t('checkout.discount')}
                value={`−${formatMoney(quote.data.breakdown.discount, locale)}`}
              />
            ) : null}
            <Divider />
            <Line
              label={t('checkout.total')}
              value={formatMoney(quote.data.breakdown.total, locale)}
              strong
            />
            <AppText variant="footnote" color={colors.textSecondary}>
              {t('checkout.holdNote', { minutes: quote.data.holdMinutes })}
            </AppText>
          </>
        )}
      </Card>

      <Card>
        <AppText variant="headline">{t('checkout.policyTitle')}</AppText>
        <AppText variant="footnote" color={colors.textSecondary}>
          {t('checkout.policyPending')}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
