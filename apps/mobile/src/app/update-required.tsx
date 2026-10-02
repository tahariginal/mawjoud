import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Layout';
import { EmptyState } from '@/components/ui/StateViews';

/** Shown when the API reports this app version is no longer supported. Store links pending (D9). */
export default function UpdateRequiredScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <EmptyState
        icon="refresh-outline"
        title={t('updateRequired.title')}
        body={t('updateRequired.body')}
      />
    </Screen>
  );
}
