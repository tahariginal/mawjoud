import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Divider, Group, Screen } from '@/components/ui/Layout';
import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { colors } from '@/design/tokens';
import { PLANNED_LANGUAGES, SUPPORTED_LANGUAGES } from '@/i18n';

export default function LanguageScreen() {
  const { t, i18n } = useTranslation();
  return (
    <Screen scroll>
      <Stack.Screen options={{ title: t('settings.languageTitle') }} />
      <Group>
        {SUPPORTED_LANGUAGES.map((lng) => (
          <ListRow
            key={lng}
            title={t(`settings.languageNames.${lng}`)}
            showChevron={false}
            onPress={() => void i18n.changeLanguage(lng)}
            right={
              i18n.language === lng ? (
                <Icon
                  name="checkmark"
                  size={20}
                  color={colors.textPrimary}
                  accessibilityLabel={t('location.selected')}
                />
              ) : undefined
            }
          />
        ))}
        {PLANNED_LANGUAGES.map((lng) => (
          <View key={lng}>
            <Divider />
            <ListRow
              title={t(`settings.languageNames.${lng}`)}
              showChevron={false}
              right={<Badge label={t('settings.translationPending')} tone="neutral" />}
            />
          </View>
        ))}
      </Group>
      <AppText variant="footnote" color={colors.textSecondary}>
        {t('settings.languageRestart')}
      </AppText>
    </Screen>
  );
}
