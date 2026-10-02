import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { stackScreenOptions } from '@/design/navigation';

export default function MerchantLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="offer/new"
        options={{ title: t('merchant.form.newTitle'), presentation: 'modal' }}
      />
      <Stack.Screen name="offer/[id]" options={{ title: t('merchant.form.editTitle') }} />
      <Stack.Screen name="apply" options={{ title: t('merchant.applyTitle') }} />
      <Stack.Screen name="staff" options={{ title: t('merchant.staff') }} />
    </Stack>
  );
}
