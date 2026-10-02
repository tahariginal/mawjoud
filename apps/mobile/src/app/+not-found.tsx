import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Layout';
import { EmptyState } from '@/components/ui/StateViews';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <EmptyState
        icon="compass-outline"
        title={t('notFound.title')}
        body={t('notFound.body')}
        actionLabel={t('notFound.home')}
        onAction={() => router.replace('/home')}
      />
    </Screen>
  );
}
