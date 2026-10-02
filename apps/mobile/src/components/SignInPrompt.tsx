import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/design/tokens';

import { Button } from './ui/Button';
import { EmptyState } from './ui/StateViews';
import type { IconName } from './ui/Icon';

/** Explains why signing in helps instead of showing a blank screen to guests. */
export function SignInPrompt({
  title,
  body,
  icon = 'person-circle-outline',
}: {
  title: string;
  body: string;
  icon?: IconName;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <EmptyState icon={icon} title={title} body={body} />
      <View style={styles.actions}>
        <Button label={t('profile.signIn')} onPress={() => router.push('/sign-in')} fullWidth />
        <Button
          label={t('profile.signUp')}
          onPress={() => router.push('/sign-up')}
          variant="secondary"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  actions: { gap: spacing.md, paddingHorizontal: spacing.xxl },
});
