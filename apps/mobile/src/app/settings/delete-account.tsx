import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { useDeleteAccount } from '@/api/authHooks';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card, Screen } from '@/components/ui/Layout';
import { TextField } from '@/components/ui/TextField';
import { useErrorMessage } from '@/lib/useErrorMessage';

/** In-app account deletion (App Store guideline 5.1.1(v); docs/SECURITY_MODEL.md §8). */
export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const remove = useDeleteAccount();
  const [password, setPassword] = useState('');

  const confirm = () =>
    Alert.alert(t('settings.deleteTitle'), t('settings.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteConfirm'),
        style: 'destructive',
        onPress: () =>
          remove.mutate(
            { password },
            {
              onSuccess: () => {
                Alert.alert(t('settings.deleted'));
                router.replace('/home');
              },
            },
          ),
      },
    ]);

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: t('settings.deleteTitle') }} />
      <Card>
        <AppText variant="body">{t('settings.deleteBody')}</AppText>
      </Card>
      {remove.isError ? <Banner tone="error" message={errorMessage(remove.error)} /> : null}
      <TextField
        label={t('settings.deletePassword')}
        value={password}
        onChangeText={setPassword}
        password
        showPasswordLabel={t('auth.showPassword')}
        hidePasswordLabel={t('auth.hidePassword')}
        autoComplete="current-password"
      />
      <Button
        label={t('settings.deleteConfirm')}
        variant="destructive"
        disabled={password.length === 0}
        loading={remove.isPending}
        onPress={confirm}
        fullWidth
      />
    </Screen>
  );
}
