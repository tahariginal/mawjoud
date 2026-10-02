import type { MerchantOffer } from '@mawjood/contracts';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { useMerchantOffers, useOfferLifecycle } from '@/api/merchantHooks';
import { PickupWindowText } from '@/components/Price';
import { OfferStatusBadge } from '@/components/StatusBadges';
import { TabHeader } from '@/components/TabHeader';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card, Screen } from '@/components/ui/Layout';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { colors, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useMerchantContext } from '@/state/merchantContext';

function OfferItem({ offer }: { offer: MerchantOffer }) {
  const { t } = useTranslation();
  const lifecycle = useOfferLifecycle();
  const finished = offer.status === 'ENDED' || offer.status === 'REMOVED';

  const confirmEnd = () =>
    Alert.alert(t('merchant.endConfirmTitle'), t('merchant.endConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('merchant.end'),
        style: 'destructive',
        onPress: () => lifecycle.mutate({ id: offer.id, action: 'end' }),
      },
    ]);

  return (
    <Card>
      <View style={styles.top}>
        <AppText variant="headline" style={styles.flex} numberOfLines={2}>
          {offer.title}
        </AppText>
        <OfferStatusBadge status={offer.status} />
      </View>
      <PickupWindowText window={offer.pickup} />
      <AppText variant="subhead">
        {formatMoney(offer.price, currentLocale())} ·{' '}
        {t('merchant.remaining', {
          available: offer.quantityAvailable,
          total: offer.quantityTotal,
        })}
      </AppText>
      <AppText variant="footnote" color={colors.textSecondary}>
        {t('merchant.reserved', { count: offer.quantityReservedOrSold })}
      </AppText>
      {!finished ? (
        <View style={styles.actions}>
          <Button
            label={t('common.edit')}
            icon="create-outline"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/merchant/offer/[id]', params: { id: offer.id } })
            }
          />
          <Button
            label={offer.status === 'PAUSED' ? t('merchant.resume') : t('merchant.pause')}
            icon={offer.status === 'PAUSED' ? 'play-outline' : 'pause-outline'}
            variant="secondary"
            loading={lifecycle.isPending && lifecycle.variables?.action !== 'end'}
            onPress={() =>
              lifecycle.mutate({
                id: offer.id,
                action: offer.status === 'PAUSED' ? 'resume' : 'pause',
              })
            }
          />
          <Button
            label={t('merchant.end')}
            icon="stop-outline"
            variant="destructive"
            onPress={confirmEnd}
          />
        </View>
      ) : null}
    </Card>
  );
}

export default function MerchantOffersScreen() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { context } = useMerchantContext();
  const offers = useMerchantOffers(context?.business.id);
  const lifecycle = useOfferLifecycle();

  let body;
  if (offers.isPending) body = <ListSkeleton rows={3} rowHeight={140} />;
  else if (offers.isError) {
    body = (
      <ErrorState
        error={offers.error}
        onRetry={() => void offers.refetch()}
        retrying={offers.isRefetching}
      />
    );
  } else if (offers.data.length === 0) {
    body = (
      <EmptyState
        icon="pricetag-outline"
        title={t('merchant.noOffers')}
        actionLabel={t('merchant.newOffer')}
        onAction={() => router.push('/merchant/offer/new')}
      />
    );
  } else {
    body = (
      <FlashList
        data={offers.data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <OfferItem offer={item} />
          </View>
        )}
        refreshing={offers.isRefetching}
        onRefresh={() => void offers.refetch()}
      />
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <TabHeader
        title={t('merchant.offersTitle')}
        right={
          <Button
            label={t('merchant.newOffer')}
            icon="add"
            onPress={() => router.push('/merchant/offer/new')}
          />
        }
      />
      {lifecycle.isError ? (
        <View style={styles.item}>
          <Banner tone="error" message={errorMessage(lifecycle.error)} />
        </View>
      ) : null}
      <View style={styles.flex}>{body}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  item: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  top: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
