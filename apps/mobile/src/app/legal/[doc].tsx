import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { useAppConfig } from '@/api/hooks';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Layout';

/**
 * PLACEHOLDER: legal texts are pending counsel review. When the API's app config provides URLs,
 * the documents open in the in-app browser.
 */
export default function LegalScreen() {
  const { t } = useTranslation();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const config = useAppConfig();
  const isTerms = doc === 'terms';
  const url = isTerms ? config.data?.legal.termsUrl : config.data?.legal.privacyUrl;

  return (
    <Screen scroll>
      <Stack.Screen
        options={{ title: isTerms ? t('legal.termsTitle') : t('legal.privacyTitle') }}
      />
      <AppText variant="title2" accessibilityRole="header">
        {isTerms ? t('legal.termsTitle') : t('legal.privacyTitle')}
      </AppText>
      {url ? (
        <Button
          label={isTerms ? t('legal.termsTitle') : t('legal.privacyTitle')}
          onPress={() => void WebBrowser.openBrowserAsync(url)}
        />
      ) : (
        <Banner tone="info" message={t('legal.pendingBody')} />
      )}
    </Screen>
  );
}
