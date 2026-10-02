import { router, useLocalSearchParams } from 'expo-router';

import { useMerchantOffer, useSaveMerchantOffer } from '@/api/merchantHooks';
import { OfferForm } from '@/components/OfferForm';
import { Banner } from '@/components/ui/Banner';
import { Screen } from '@/components/ui/Layout';
import { ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useMerchantContext } from '@/state/merchantContext';

export default function EditOfferScreen() {
  const errorMessage = useErrorMessage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { context } = useMerchantContext();
  const offer = useMerchantOffer(id);
  const save = useSaveMerchantOffer();
  const location =
    context?.business.locations.find((l) => l.id === offer.data?.locationId) ?? context?.location;

  if (offer.isPending || !location) {
    return (
      <Screen>
        <ListSkeleton rows={4} rowHeight={64} />
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
  return (
    <Screen scroll>
      {save.isError ? <Banner tone="error" message={errorMessage(save.error)} /> : null}
      <OfferForm
        key={`${offer.data.id}:${offer.data.version}`}
        locationId={location.id}
        timezone={location.timezone}
        offer={offer.data}
        submitting={save.isPending}
        onSubmit={(input) =>
          save.mutate(
            { id: offer.data.id, version: offer.data.version, input },
            { onSuccess: () => router.back() },
          )
        }
      />
    </Screen>
  );
}
