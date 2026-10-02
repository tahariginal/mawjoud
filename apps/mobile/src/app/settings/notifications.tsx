import { NotificationType, TimeOfDay, type NotificationPreferences } from '@mawjood/contracts';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/api/hooks';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Divider, Group, Screen, SwitchRow } from '@/components/ui/Layout';
import { ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { Stepper } from '@/components/ui/Stepper';
import { TextField } from '@/components/ui/TextField';
import { colors, radius, spacing } from '@/design/tokens';
import { useErrorMessage } from '@/lib/useErrorMessage';

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const prefs = useNotificationPreferences();
  const save = useUpdateNotificationPreferences();
  const [edited, setDraft] = useState<NotificationPreferences | null>(null);
  // Server data until the user edits; then the local draft.
  const draft = edited ?? prefs.data ?? null;

  const title = <Stack.Screen options={{ title: t('settings.notificationsTitle') }} />;
  if (prefs.isPending) {
    return (
      <Screen>
        {title}
        <ListSkeleton rows={4} rowHeight={56} />
      </Screen>
    );
  }
  if (prefs.isError || !draft) {
    return (
      <Screen>
        {title}
        <ErrorState
          error={prefs.error}
          onRetry={() => void prefs.refetch()}
          retrying={prefs.isRefetching}
        />
      </Screen>
    );
  }

  const quietValid =
    TimeOfDay.safeParse(draft.quietHours.start).success &&
    TimeOfDay.safeParse(draft.quietHours.end).success;
  const setChannel = (type: NotificationType, channel: 'push' | 'email', value: boolean) =>
    setDraft({
      ...draft,
      types: { ...draft.types, [type]: { ...draft.types[type], [channel]: value } },
    });

  return (
    <Screen
      scroll
      footer={
        <Button
          label={t('common.save')}
          disabled={!quietValid}
          loading={save.isPending}
          onPress={() => save.mutate(draft)}
          fullWidth
        />
      }
    >
      {title}
      <Banner tone="info" message={t('settings.pushPending')} />
      {save.isSuccess ? <Banner tone="success" message={t('settings.saved')} /> : null}
      {save.isError ? <Banner tone="error" message={errorMessage(save.error)} /> : null}

      {NotificationType.options.map((type) => (
        <View key={type} style={styles.section}>
          <AppText variant="headline">{t(`settings.types.${type}`)}</AppText>
          <Group>
            <SwitchRow
              label={t('settings.push')}
              value={draft.types[type].push}
              onValueChange={(v) => setChannel(type, 'push', v)}
            />
            <Divider />
            <SwitchRow
              label={t('settings.email')}
              value={draft.types[type].email}
              onValueChange={(v) => setChannel(type, 'email', v)}
            />
          </Group>
        </View>
      ))}

      <View style={styles.section}>
        <Group>
          <SwitchRow
            label={t('settings.quietHours')}
            description={t('settings.quietHoursBody', {
              start: draft.quietHours.start,
              end: draft.quietHours.end,
            })}
            value={draft.quietHours.enabled}
            onValueChange={(enabled) =>
              setDraft({ ...draft, quietHours: { ...draft.quietHours, enabled } })
            }
          />
        </Group>
        {draft.quietHours.enabled ? (
          <View style={styles.times}>
            <View style={styles.flex}>
              <TextField
                label={t('settings.quietStart')}
                value={draft.quietHours.start}
                onChangeText={(start) =>
                  setDraft({ ...draft, quietHours: { ...draft.quietHours, start } })
                }
                error={
                  TimeOfDay.safeParse(draft.quietHours.start).success
                    ? undefined
                    : t('validation.time')
                }
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label={t('settings.quietEnd')}
                value={draft.quietHours.end}
                onChangeText={(end) =>
                  setDraft({ ...draft, quietHours: { ...draft.quietHours, end } })
                }
                error={
                  TimeOfDay.safeParse(draft.quietHours.end).success
                    ? undefined
                    : t('validation.time')
                }
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Stepper
          label={t('settings.maxPerDay')}
          value={draft.maxFavoriteAlertsPerDay}
          min={0}
          max={10}
          onChange={(maxFavoriteAlertsPerDay) => setDraft({ ...draft, maxFavoriteAlertsPerDay })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  times: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  card: { backgroundColor: colors.bgSurface, borderRadius: radius.lg, padding: spacing.lg },
});
