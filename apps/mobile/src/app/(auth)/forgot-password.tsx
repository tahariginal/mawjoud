import { zodResolver } from '@hookform/resolvers/zod';
import { ForgotPasswordRequest } from '@mazal/contracts';
import { Stack, router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useForgotPassword } from '@/api/authHooks';
import { FormField } from '@/components/FormField';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Layout';
import { colors, spacing } from '@/design/tokens';
import { useErrorMessage } from '@/lib/useErrorMessage';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const forgot = useForgotPassword();
  const { control, handleSubmit } = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(ForgotPasswordRequest),
    defaultValues: { email: '' },
  });

  // The API always answers 202 (no account enumeration), so we always continue.
  const submit = handleSubmit((values) =>
    forgot.mutate(values, {
      onSuccess: () =>
        router.replace({ pathname: '/reset-password', params: { email: values.email } }),
    }),
  );

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: t('auth.forgotTitle') }} />
      <AppText variant="title1" accessibilityRole="header">
        {t('auth.forgotTitle')}
      </AppText>
      <AppText variant="body" color={colors.textSecondary}>
        {t('auth.forgotBody')}
      </AppText>
      {forgot.isError ? <Banner tone="error" message={errorMessage(forgot.error)} /> : null}
      <View style={styles.form}>
        <FormField
          control={control}
          name="email"
          label={t('auth.email')}
          errorMessage={t('validation.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          onSubmitEditing={() => void submit()}
        />
        <Button
          label={t('auth.sendCode')}
          onPress={() => void submit()}
          loading={forgot.isPending}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
});
