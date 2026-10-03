import { zodResolver } from '@hookform/resolvers/zod';
import { PASSWORD_MIN_LENGTH, RegisterRequest } from '@mazal/contracts';
import { Stack, router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useRegister } from '@/api/authHooks';
import { FormField } from '@/components/FormField';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Layout';
import { colors, spacing } from '@/design/tokens';
import { useErrorMessage } from '@/lib/useErrorMessage';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const register = useRegister();
  const { control, handleSubmit } = useForm<RegisterRequest>({
    resolver: zodResolver(RegisterRequest),
    defaultValues: { displayName: '', email: '', password: '', locale: 'en' },
  });

  const submit = handleSubmit((values) =>
    register.mutate(values, { onSuccess: () => router.replace('/verify-email') }),
  );

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: t('auth.signUp') }} />
      <AppText variant="title1" accessibilityRole="header">
        {t('auth.signUpTitle')}
      </AppText>
      {register.isError ? <Banner tone="error" message={errorMessage(register.error)} /> : null}
      <View style={styles.form}>
        <FormField
          control={control}
          name="displayName"
          label={t('auth.name')}
          errorMessage={t('validation.required')}
          autoComplete="name"
          textContentType="name"
        />
        <FormField
          control={control}
          name="email"
          label={t('auth.email')}
          errorMessage={t('validation.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <FormField
          control={control}
          name="password"
          label={t('auth.password')}
          helper={t('auth.passwordRule', { min: PASSWORD_MIN_LENGTH })}
          errorMessage={t('validation.passwordMin', { min: PASSWORD_MIN_LENGTH })}
          password
          showPasswordLabel={t('auth.showPassword')}
          hidePasswordLabel={t('auth.hidePassword')}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <AppText variant="footnote" color={colors.textSecondary}>
          {t('auth.consent')}
        </AppText>
        <Button
          label={t('auth.signUp')}
          onPress={() => void submit()}
          loading={register.isPending}
          fullWidth
        />
      </View>
      <View style={styles.row}>
        <AppText variant="subhead">{t('auth.haveAccount')}</AppText>
        <Button
          label={t('auth.signIn')}
          variant="tertiary"
          onPress={() => router.replace('/sign-in')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
});
