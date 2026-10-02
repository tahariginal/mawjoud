import { zodResolver } from '@hookform/resolvers/zod';
import { MerchantApplicationRequest } from '@mawjood/contracts';
import * as Location from 'expo-location';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useCategories } from '@/api/hooks';
import { useSubmitApplication } from '@/api/merchantHooks';
import { FormField } from '@/components/FormField';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Layout';
import { EmptyState } from '@/components/ui/StateViews';
import { colors, spacing } from '@/design/tokens';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useSession } from '@/state/session';

export default function ApplyScreen() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { status, me } = useSession();
  const categories = useCategories();
  const submit = useSubmitApplication();
  const [locating, setLocating] = useState(false);
  const [pinProblem, setPinProblem] = useState(false);
  const { control, handleSubmit } = useForm<MerchantApplicationRequest>({
    resolver: zodResolver(MerchantApplicationRequest),
    defaultValues: {
      businessName: '',
      legalName: '',
      categoryId: '',
      addressLine: '',
      city: 'Casablanca',
      phone: '',
      contactEmail: me?.email ?? '',
    },
  });

  if (status === 'signedOut') return <Redirect href="/sign-in" />;

  if (submit.isSuccess) {
    return (
      <Screen>
        <EmptyState
          icon="checkmark-circle-outline"
          title={t('merchant.submittedTitle')}
          body={t('merchant.submittedBody')}
          actionLabel={t('common.done')}
          onAction={() => router.replace('/profile')}
        />
      </Screen>
    );
  }

  const send = handleSubmit((values) => submit.mutate(values));

  return (
    <Screen scroll>
      <AppText variant="body" color={colors.textSecondary}>
        {t('merchant.applyBody')}
      </AppText>
      {submit.isError ? <Banner tone="error" message={errorMessage(submit.error)} /> : null}
      <View style={styles.form}>
        <FormField
          control={control}
          name="businessName"
          label={t('merchant.businessName')}
          errorMessage={t('validation.required')}
        />
        <FormField
          control={control}
          name="legalName"
          label={t('merchant.legalName')}
          errorMessage={t('validation.required')}
        />
        <View style={styles.group}>
          <AppText variant="subhead" weight="medium">
            {t('merchant.form.category')}
          </AppText>
          <Controller
            control={control}
            name="categoryId"
            render={({ field, fieldState }) => (
              <>
                <View style={styles.chips}>
                  {(categories.data ?? []).map((c) => (
                    <Chip
                      key={c.id}
                      label={c.name}
                      selected={field.value === c.id}
                      onPress={() => field.onChange(c.id)}
                    />
                  ))}
                </View>
                {fieldState.error ? (
                  <AppText variant="footnote" color={colors.errorFg}>
                    {t('validation.required')}
                  </AppText>
                ) : null}
              </>
            )}
          />
        </View>
        <FormField
          control={control}
          name="addressLine"
          label={t('merchant.addressLine')}
          errorMessage={t('validation.required')}
        />
        <FormField
          control={control}
          name="city"
          label={t('merchant.city')}
          errorMessage={t('validation.required')}
        />
        <FormField
          control={control}
          name="phone"
          label={t('merchant.phone')}
          errorMessage={t('validation.phone')}
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        <FormField
          control={control}
          name="contactEmail"
          label={t('merchant.contactEmail')}
          errorMessage={t('validation.email')}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Controller
          control={control}
          name="location"
          render={({ field, fieldState }) => (
            <View style={styles.group}>
              <AppText variant="subhead" weight="medium">
                {t('merchant.storePin')}
              </AppText>
              <AppText variant="footnote" color={colors.textSecondary}>
                {t('merchant.storePinHint')}
              </AppText>
              <Button
                label={field.value ? t('merchant.storePinDone') : t('merchant.storePinAction')}
                icon={field.value ? 'checkmark-circle-outline' : 'navigate-outline'}
                variant="secondary"
                loading={locating}
                onPress={async () => {
                  setPinProblem(false);
                  setLocating(true);
                  try {
                    const permission = await Location.requestForegroundPermissionsAsync();
                    if (permission.status !== 'granted') {
                      setPinProblem(true);
                      return;
                    }
                    const pos = await Location.getCurrentPositionAsync({
                      accuracy: Location.Accuracy.High,
                    });
                    field.onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  } catch {
                    setPinProblem(true);
                  } finally {
                    setLocating(false);
                  }
                }}
              />
              {pinProblem ? (
                <AppText variant="footnote" color={colors.errorFg}>
                  {t('location.permissionDenied')}
                </AppText>
              ) : fieldState.error ? (
                <AppText variant="footnote" color={colors.errorFg}>
                  {t('validation.required')}
                </AppText>
              ) : null}
            </View>
          )}
        />
        <Button
          label={t('merchant.submit')}
          loading={submit.isPending}
          onPress={() => void send()}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
