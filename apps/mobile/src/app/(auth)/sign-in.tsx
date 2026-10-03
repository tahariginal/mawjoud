import { zodResolver } from '@hookform/resolvers/zod';
import { LoginRequest } from '@mazal/contracts';
import { Link, Stack, router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useLogin } from '@/api/authHooks';
import { FormField } from '@/components/FormField';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Layout';
import { colors, spacing } from '@/design/tokens';
import { useErrorMessage } from '@/lib/useErrorMessage';

export default function SignInScreen() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const login = useLogin();
  const { control, handleSubmit } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequest),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: ({ me }) => {
        if (!me.emailVerified) router.replace('/verify-email');
        else if (router.canGoBack()) router.back();
        else router.replace('/home');
      },
    }),
  );

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: t('auth.signIn') }} />
      <AppText variant="title1" accessibilityRole="header">
        {t('auth.signInTitle')}
      </AppText>
      {login.isError ? <Banner tone="error" message={errorMessage(login.error)} /> : null}
      <View style={styles.form}>
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
          errorMessage={t('validation.required')}
          password
          showPasswordLabel={t('auth.showPassword')}
          hidePasswordLabel={t('auth.hidePassword')}
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={() => void submit()}
        />
        <Link href="/forgot-password" style={styles.link}>
          <AppText variant="subhead" weight="semibold" color={colors.brand}>
            {t('auth.forgot')}
          </AppText>
        </Link>
        <Button
          label={t('auth.signIn')}
          onPress={() => void submit()}
          loading={login.isPending}
          fullWidth
        />
      </View>
      <AppText variant="footnote" color={colors.textSecondary} align="center">
        {t('auth.oauthPending')}
      </AppText>
      <View style={styles.row}>
        <AppText variant="subhead">{t('auth.noAccount')}</AppText>
        <Button
          label={t('auth.signUp')}
          variant="tertiary"
          onPress={() => router.replace('/sign-up')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  link: { alignSelf: 'flex-start', paddingVertical: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
});
