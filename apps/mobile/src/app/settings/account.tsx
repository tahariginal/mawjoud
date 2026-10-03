import { DisplayName } from '@mazal/contracts';
import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useUpdateMe } from '@/api/authHooks';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card, Screen } from '@/components/ui/Layout';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/design/tokens';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useSession } from '@/state/session';

export default function AccountScreen() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const me = useSession((s) => s.me);
  const update = useUpdateMe();
  const [name, setName] = useState(me?.displayName ?? '');

  if (!me) return <Redirect href="/sign-in" />;
  const valid = DisplayName.safeParse(name).success;

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: t('settings.accountTitle') }} />
      {update.isSuccess ? <Banner tone="success" message={t('settings.saved')} /> : null}
      {update.isError ? <Banner tone="error" message={errorMessage(update.error)} /> : null}
      <TextField
        label={t('settings.displayName')}
        value={name}
        onChangeText={setName}
        error={valid ? undefined : t('validation.required')}
        autoComplete="name"
      />
      <Card>
        <AppText variant="subhead" color={colors.textSecondary}>
          {t('settings.emailLabel')}
        </AppText>
        <AppText variant="body">{me.email}</AppText>
      </Card>
      <Button
        label={t('common.save')}
        disabled={!valid || name.trim() === me.displayName}
        loading={update.isPending}
        onPress={() => update.mutate({ displayName: name.trim() })}
        fullWidth
      />
    </Screen>
  );
}
