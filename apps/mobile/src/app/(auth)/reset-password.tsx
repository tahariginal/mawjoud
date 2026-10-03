import { zodResolver } from '@hookform/resolvers/zod';
import { PASSWORD_MIN_LENGTH, ResetPasswordRequest } from '@mazal/contracts';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useResetPassword } from '@/api/authHooks';
import { DEMO_ONE_TIME_CODE } from '@/api/demo';
import { FormField } from '@/components/FormField';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Layout';
import { env } from '@/config/env';
import { spacing } from '@/design/tokens';
import { useErrorMessage } from '@/lib/useErrorMessage';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const reset = useResetPassword();
  const { control, handleSubmit } = useForm<ResetPasswordRequest>({
    resolver: zodResolver(ResetPasswordRequest),
    defaultValues: { email: email ?? '', code: '', newPassword: '' },
  });

  const submit = handleSubmit((values) => reset.mutate(values));

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: t('auth.resetTitle') }} />
      <AppText variant="title1" accessibilityRole="header">
        {t('auth.resetTitle')}
      </AppText>
      {env.apiMode === 'demo' ? (
        <Banner
          tone="warning"
          icon="flask-outline"
          message={t('auth.demoCodeHint', { code: DEMO_ONE_TIME_CODE })}
        />
      ) : null}
      {reset.isError ? <Banner tone="error" message={errorMessage(reset.error)} /> : null}
      {reset.isSuccess ? (
        <View style={styles.form}>
          <Banner tone="success" message={t('auth.resetDone')} />
          <Button label={t('auth.signIn')} onPress={() => router.replace('/sign-in')} fullWidth />
        </View>
      ) : (
        <View style={styles.form}>
          <FormField
            control={control}
            name="email"
            label={t('auth.email')}
            errorMessage={t('validation.email')}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FormField
            control={control}
            name="code"
            label={t('auth.code')}
            errorMessage={t('validation.code')}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
          />
          <FormField
            control={control}
            name="newPassword"
            label={t('auth.newPassword')}
            helper={t('auth.passwordRule', { min: PASSWORD_MIN_LENGTH })}
            errorMessage={t('validation.passwordMin', { min: PASSWORD_MIN_LENGTH })}
            password
            showPasswordLabel={t('auth.showPassword')}
            hidePasswordLabel={t('auth.hidePassword')}
            autoComplete="new-password"
          />
          <Button
            label={t('auth.reset')}
            onPress={() => void submit()}
            loading={reset.isPending}
            fullWidth
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
});
