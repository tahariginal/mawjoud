import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Card, Group, Screen } from '@/components/ui/Layout';
import { ListRow } from '@/components/ui/ListRow';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  return (
    <Screen scroll>
      <Stack.Screen options={{ title: t('settings.privacyTitle') }} />
      <Card>
        <AppText variant="body">{t('settings.privacyLocation')}</AppText>
        <AppText variant="body">{t('settings.privacyData')}</AppText>
        <AppText variant="body">{t('settings.privacyMarketing')}</AppText>
      </Card>
      <Group>
        <ListRow
          icon="document-text-outline"
          title={t('profile.privacyPolicy')}
          onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })}
        />
      </Group>
    </Screen>
  );
}
