import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { useAppConfig } from '@/api/hooks';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card, Screen } from '@/components/ui/Layout';

export default function HelpScreen() {
  const { t } = useTranslation();
  const config = useAppConfig();
  const email = config.data?.supportEmail ?? null;
  return (
    <Screen scroll>
      <Stack.Screen options={{ title: t('help.title') }} />
      <Card>
        <AppText variant="body">{t('help.body')}</AppText>
      </Card>
      {email ? (
        <Button
          label={email}
          icon="mail-outline"
          variant="secondary"
          onPress={() => void Linking.openURL(`mailto:${email}`)}
        />
      ) : (
        // PLACEHOLDER: support channel pending client decision.
        <Banner tone="info" message={t('help.contactPending')} />
      )}
    </Screen>
  );
}
