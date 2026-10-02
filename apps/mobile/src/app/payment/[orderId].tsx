import type { PaymentClientParams } from '@mawjood/contracts';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { api } from '@/api';
import { useOrder, useSimulatePayment } from '@/api/hooks';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card, Screen } from '@/components/ui/Layout';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { env } from '@/config/env';
import { colors, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { newUuid } from '@/lib/ids';
import { formatMoney } from '@/lib/format';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { usePendingPayments } from '@/state/pendingPayments';

/** After this long without a final status we tell the user we will notify them. */
const STILL_CHECKING_AFTER_MS = 60_000;

function Checking({ since }: { since: number }) {
  const { t } = useTranslation();
  const [long, setLong] = useState(false);
  useEffect(() => {
    const timer = setTimeout(
      () => setLong(true),
      Math.max(0, since + STILL_CHECKING_AFTER_MS - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [since]);
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.textBrand} />
      <AppText variant="title2" align="center">
        {t('payment.checking')}
      </AppText>
      <AppText variant="body" color={colors.textSecondary} align="center">
        {long ? t('payment.stillChecking') : t('payment.checkingBody')}
      </AppText>
    </View>
  );
}

export default function PaymentScreen() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const order = useOrder(orderId, { pollWhilePending: true });
  const stored = usePendingPayments((s) => s.byOrderId[orderId]);
  const setPending = usePendingPayments((s) => s.set);
  const clearPending = usePendingPayments((s) => s.clear);
  const simulate = useSimulatePayment(orderId);
  const [params, setParams] = useState<PaymentClientParams | null>(stored ?? null);
  const [resumeError, setResumeError] = useState<unknown>(null);
  const [checkingSince, setCheckingSince] = useState<number | null>(null);

  const status = order.data?.status;

  // After a restart the parameters are gone: ask the server to resume (idempotent).
  useEffect(() => {
    if (params || (status !== 'PAYMENT_PENDING' && status !== 'CREATED')) return;
    let active = true;
    api
      .resumePayment(orderId, newUuid())
      .then((result) => {
        if (!active) return;
        setPending(orderId, result.payment);
        setParams(result.payment);
      })
      .catch((error: unknown) => active && setResumeError(error));
    return () => {
      active = false;
    };
  }, [params, status, orderId, setPending]);

  useEffect(() => {
    if (status && status !== 'PAYMENT_PENDING' && status !== 'CREATED') clearPending(orderId);
  }, [status, orderId, clearPending]);

  const title = (
    <Stack.Screen
      options={{ title: t('payment.title'), headerBackVisible: false, gestureEnabled: false }}
    />
  );

  if (order.isPending) {
    return (
      <Screen>
        {title}
        <ListSkeleton rows={2} />
      </Screen>
    );
  }
  if (order.isError) {
    return (
      <Screen>
        {title}
        <ErrorState
          error={order.error}
          onRetry={() => void order.refetch()}
          retrying={order.isRefetching}
        />
      </Screen>
    );
  }

  const o = order.data;
  const done = (
    <Button
      label={t('payment.backHome')}
      variant="tertiary"
      onPress={() => router.replace('/home')}
    />
  );

  if (o.status === 'CONFIRMED' || o.status === 'READY_FOR_PICKUP') {
    return (
      <Screen>
        {title}
        <View style={styles.center}>
          <EmptyState
            icon="checkmark-circle-outline"
            title={t('payment.confirmedTitle')}
            body={t('payment.confirmedBody', { store: o.store.name })}
          />
          <Button
            label={t('payment.viewPass')}
            icon="qr-code-outline"
            onPress={() => router.replace({ pathname: '/order/[id]', params: { id: o.id } })}
          />
          {done}
        </View>
      </Screen>
    );
  }
  if (o.status === 'FAILED' || o.status === 'EXPIRED' || o.status === 'CANCELLED') {
    const failed = o.status === 'FAILED';
    return (
      <Screen>
        {title}
        <View style={styles.center}>
          <EmptyState
            icon={failed ? 'alert-circle-outline' : 'time-outline'}
            title={failed ? t('payment.failedTitle') : t('payment.expiredTitle')}
            body={failed ? t('payment.failedBody') : t('payment.expiredBody')}
          />
          <Button
            label={t('common.retry')}
            onPress={() => {
              const offerId = o.items[0]?.offerId;
              if (offerId) router.replace({ pathname: '/offer/[id]', params: { id: offerId } });
            }}
          />
          {done}
        </View>
      </Screen>
    );
  }
  if (o.status !== 'PAYMENT_PENDING' && o.status !== 'CREATED') {
    return <Redirect href={{ pathname: '/order/[id]', params: { id: o.id } }} />;
  }

  if (checkingSince !== null) {
    return (
      <Screen>
        {title}
        <Checking since={checkingSince} />
      </Screen>
    );
  }

  const total = formatMoney(o.breakdown.total, currentLocale());

  return (
    <Screen scroll>
      {title}
      <Card>
        <AppText variant="headline">{o.store.name}</AppText>
        <AppText variant="title2" color={colors.textBrand}>
          {total}
        </AppText>
      </Card>

      {resumeError ? <Banner tone="error" message={errorMessage(resumeError)} /> : null}
      {simulate.isError ? <Banner tone="error" message={errorMessage(simulate.error)} /> : null}

      {!params ? (
        <ListSkeleton rows={1} />
      ) : params.kind === 'DEV_SIMULATOR' && env.apiMode === 'demo' ? (
        <Card>
          <Banner
            tone="warning"
            icon="flask-outline"
            title={t('payment.devTitle')}
            message={t('payment.devBody')}
          />
          <Button
            label={t('payment.simulateSuccess')}
            icon="checkmark-circle-outline"
            loading={simulate.isPending && simulate.variables === 'success'}
            disabled={simulate.isPending}
            onPress={() => simulate.mutate('success')}
            fullWidth
          />
          <Button
            label={t('payment.simulateFailure')}
            variant="destructive"
            disabled={simulate.isPending}
            onPress={() => simulate.mutate('failure')}
            fullWidth
          />
        </Card>
      ) : params.kind === 'HOSTED_PAGE' ? (
        <Button
          label={t('checkout.pay', { amount: total })}
          icon="lock-closed-outline"
          fullWidth
          onPress={async () => {
            setCheckingSince(Date.now());
            // Whatever the browser result is, the backend (webhook + reconciliation) decides.
            await WebBrowser.openAuthSessionAsync(params.url, params.returnUrl);
            void order.refetch();
          }}
        />
      ) : (
        // PLACEHOLDER: native payment sheets depend on the provider decision (ADR-006, D1).
        <Banner
          tone="info"
          title={t('payment.providerPendingTitle')}
          message={t('payment.providerPendingBody')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xxl,
  },
});
