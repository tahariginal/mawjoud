import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useSaveMerchantOffer } from '@/api/merchantHooks';
import { OfferForm } from '@/components/OfferForm';
import { Banner } from '@/components/ui/Banner';
import { Screen } from '@/components/ui/Layout';
import { ListSkeleton } from '@/components/ui/StateViews';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useMerchantContext } from '@/state/merchantContext';

export default function NewOfferScreen() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { context } = useMerchantContext();
  const save = useSaveMerchantOffer();
  const location = context?.location;

  if (!location) {
    return (
      <Screen>
        <ListSkeleton rows={4} rowHeight={64} />
      </Screen>
    );
  }
  return (
    <Screen scroll>
      {save.isError ? <Banner tone="error" message={errorMessage(save.error)} /> : null}
      <OfferForm
        locationId={location.id}
        timezone={location.timezone}
        submitting={save.isPending}
        onSubmit={(input) => save.mutate({ input }, { onSuccess: () => router.back() })}
      />
      {save.isSuccess ? <Banner tone="success" message={t('merchant.form.saved')} /> : null}
    </Screen>
  );
}
