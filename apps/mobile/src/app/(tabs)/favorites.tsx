import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useFavorites } from '@/api/hooks';
import { SignInPrompt } from '@/components/SignInPrompt';
import { StoreRow } from '@/components/StoreRow';
import { TabHeader } from '@/components/TabHeader';
import { Screen } from '@/components/ui/Layout';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { spacing } from '@/design/tokens';
import { useLocationStore } from '@/state/location';
import { useSession } from '@/state/session';

function FavoritesList() {
  const { t } = useTranslation();
  const point = useLocationStore((s) => s.selected.point);
  const favorites = useFavorites(point);
  if (favorites.isPending) return <ListSkeleton rows={4} rowHeight={72} />;
  if (favorites.isError) {
    return (
      <ErrorState
        error={favorites.error}
        onRetry={() => void favorites.refetch()}
        retrying={favorites.isRefetching}
      />
    );
  }
  if (favorites.data.length === 0) {
    return (
      <EmptyState
        icon="heart-outline"
        title={t('favorites.emptyTitle')}
        body={t('favorites.emptyBody')}
        actionLabel={t('orders.findFood')}
        onAction={() => router.push('/explore')}
      />
    );
  }
  // Places with food first.
  const sorted = [...favorites.data].sort((a, b) => b.availableOffers - a.availableOffers);
  return (
    <FlashList
      data={sorted}
      keyExtractor={(item) => item.store.id}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <StoreRow
            store={item.store}
            subtitle={
              item.availableOffers > 0
                ? t('favorites.hasFood', { count: item.availableOffers })
                : t('favorites.noFood')
            }
          />
        </View>
      )}
      refreshing={favorites.isRefetching}
      onRefresh={() => void favorites.refetch()}
    />
  );
}

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const status = useSession((s) => s.status);
  return (
    <Screen edges={['top', 'left', 'right']}>
      <TabHeader title={t('tabs.favorites')} />
      {status === 'signedOut' ? (
        <SignInPrompt
          icon="heart-outline"
          title={t('favorites.signInTitle')}
          body={t('favorites.signInBody')}
        />
      ) : status === 'loading' ? (
        <ListSkeleton rows={4} rowHeight={72} />
      ) : (
        <FavoritesList />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
});
