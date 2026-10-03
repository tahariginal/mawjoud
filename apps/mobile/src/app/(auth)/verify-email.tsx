import { zodResolver } from '@hookform/resolvers/zod';
import { VerifyEmailRequest } from '@mazal/contracts';
import { Redirect, Stack, router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useResendVerification, useVerifyEmail } from '@/api/authHooks';
import { DEMO_ONE_TIME_CODE } from '@/api/demo';
import { FormField } from '@/components/FormField';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Layout';
import { env } from '@/config/env';
import { colors, spacing } from '@/design/tokens';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useSession } from '@/state/session';

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const me = useSession((s) => s.me);
  const verify = useVerifyEmail();
  const resend = useResendVerification();
  const { control, handleSubmit } = useForm<VerifyEmailRequest>({
    resolver: zodResolver(VerifyEmailRequest),
    defaultValues: { code: '' },
  });

  if (!me) return <Redirect href="/sign-in" />;

  const submit = handleSubmit((values) =>
    verify.mutate(values, {
      onSuccess: () => (router.canGoBack() ? router.back() : router.replace('/home')),
    }),
  );

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: t('auth.verify') }} />
      <AppText variant="title1" accessibilityRole="header">
        {t('auth.verifyTitle')}
      </AppText>
      <AppText variant="body" color={colors.textSecondary}>
        {t('auth.verifyBody', { email: me.email })}
      </AppText>
      {env.apiMode === 'demo' ? (
        <Banner
          tone="warning"
          icon="flask-outline"
          message={t('auth.demoCodeHint', { code: DEMO_ONE_TIME_CODE })}
        />
      ) : null}
      {verify.isError ? <Banner tone="error" message={errorMessage(verify.error)} /> : null}
      {resend.isSuccess ? <Banner tone="success" message={t('auth.resent')} /> : null}
      <View style={styles.form}>
        <FormField
          control={control}
          name="code"
          label={t('auth.code')}
          errorMessage={t('validation.code')}
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          onSubmitEditing={() => void submit()}
        />
        <Button
          label={t('auth.verify')}
          onPress={() => void submit()}
          loading={verify.isPending}
          fullWidth
        />
        <Button
          label={t('auth.resend')}
          variant="tertiary"
          loading={resend.isPending}
          onPress={() => resend.mutate()}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
});
