import type { PickupValidateResult } from '@mawjood/contracts';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { errorCodeOf, isApiError, type ClientErrorCode } from '@/api';
import { DEMO_SEEDED_PICKUP_CODES } from '@/api/demo';
import { useValidatePickup } from '@/api/merchantHooks';
import { TabHeader } from '@/components/TabHeader';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Layout';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { TextField } from '@/components/ui/TextField';
import { env } from '@/config/env';
import { colors, radius, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { formatTime } from '@/lib/format';
import { useMerchantContext } from '@/state/merchantContext';

type Outcome =
  | { kind: 'valid'; result: PickupValidateResult }
  | { kind: 'error'; code: ClientErrorCode; details: Record<string, unknown> | undefined };

const CODE_PATTERN = /^[A-Z0-9]{6}$/;

function ResultPanel({
  outcome,
  timezone,
  onNext,
}: {
  outcome: Outcome;
  timezone: string;
  onNext: () => void;
}) {
  const { t } = useTranslation();
  const locale = currentLocale();
  const at = (iso: unknown) =>
    typeof iso === 'string' ? formatTime(new Date(iso), timezone, locale) : '—';

  let tone: { bg: string; fg: string; icon: IconName };
  let title: string;
  let body: string;
  if (outcome.kind === 'valid') {
    const o = outcome.result.order;
    tone = { bg: colors.successBg, fg: colors.successFg, icon: 'checkmark-circle' };
    title = t('merchant.scan.validTitle');
    body = t('merchant.scan.validBody', {
      quantity: o.quantity,
      title: o.offerTitle,
      initial: o.customerInitial,
    });
  } else if (outcome.code === 'PICKUP_ALREADY_COMPLETED') {
    tone = { bg: colors.warningBg, fg: colors.warningFg, icon: 'alert-circle' };
    title = t('merchant.scan.alreadyTitle');
    body = t('merchant.scan.alreadyBody', { time: at(outcome.details?.pickedUpAt) });
  } else if (outcome.code === 'PICKUP_NOT_YET_OPEN') {
    tone = { bg: colors.warningBg, fg: colors.warningFg, icon: 'time' };
    title = t('merchant.scan.notYetTitle');
    body = t('merchant.scan.notYetBody', { time: at(outcome.details?.start) });
  } else if (outcome.code === 'PICKUP_WINDOW_CLOSED') {
    tone = { bg: colors.warningBg, fg: colors.warningFg, icon: 'time' };
    title = t('merchant.scan.closedTitle');
    body = t('merchant.scan.closedBody');
  } else if (outcome.code === 'PICKUP_ORDER_CANCELLED') {
    tone = { bg: colors.errorBg, fg: colors.errorFg, icon: 'close-circle' };
    title = t('merchant.scan.cancelledTitle');
    body = t('merchant.scan.cancelledBody');
  } else {
    tone = { bg: colors.errorBg, fg: colors.errorFg, icon: 'close-circle' };
    title = t('merchant.scan.invalidTitle');
    body = t('merchant.scan.invalidBody');
  }

  return (
    <View
      style={[styles.result, { backgroundColor: tone.bg }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Icon name={tone.icon} size={56} color={tone.fg} />
      <AppText variant="title1" color={tone.fg} align="center">
        {title}
      </AppText>
      <AppText variant="body" color={tone.fg} align="center">
        {body}
      </AppText>
      <Button label={t('merchant.scan.scanNext')} icon="scan-outline" onPress={onNext} />
    </View>
  );
}

export default function ScanScreen() {
  const { t } = useTranslation();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const { context } = useMerchantContext();
  const validate = useValidatePickup();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  // Prevents the camera from firing the same QR many times per second.
  const busy = useRef(false);

  const locationId = context?.location?.id;
  const timezone = context?.location?.timezone ?? 'UTC';

  const run = (input: { token: string } | { code: string; locationId: string }) => {
    if (busy.current) return;
    busy.current = true;
    validate.mutate(
      { input },
      {
        onSuccess: (result) => {
          setOutcome({ kind: 'valid', result });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (error) => {
          const details = isApiError(error) ? error.details : undefined;
          setOutcome({ kind: 'error', code: errorCodeOf(error), details });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      },
    );
  };

  const next = () => {
    setOutcome(null);
    setCode('');
    validate.reset();
    busy.current = false;
  };

  const networkError =
    outcome?.kind === 'error' && (outcome.code === 'NETWORK_ERROR' || outcome.code === 'TIMEOUT');

  let body;
  if (outcome && !networkError) {
    body = <ResultPanel outcome={outcome} timezone={timezone} onNext={next} />;
  } else if (networkError) {
    body = (
      <View style={styles.pad}>
        <ErrorState error={validate.error} onRetry={next} />
        <Banner tone="info" message={t('merchant.scan.offlinePending')} />
      </View>
    );
  } else if (manual || !permission?.granted) {
    body = (
      <View style={styles.pad}>
        {!permission?.granted && !manual ? (
          <EmptyState
            icon="camera-outline"
            title={t('merchant.scan.permissionTitle')}
            body={t('merchant.scan.permissionBody')}
            actionLabel={t('merchant.scan.grant')}
            onAction={() => void requestPermission()}
          />
        ) : null}
        <TextField
          label={t('merchant.scan.codeLabel')}
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
        />
        <Button
          label={t('merchant.scan.validate')}
          disabled={!CODE_PATTERN.test(code) || !locationId}
          loading={validate.isPending}
          onPress={() => locationId && run({ code, locationId })}
          fullWidth
        />
        {permission?.granted ? (
          <Button
            label={t('merchant.scan.title')}
            variant="tertiary"
            icon="scan-outline"
            onPress={() => setManual(false)}
          />
        ) : null}
        {env.apiMode === 'demo' ? (
          <Banner
            tone="warning"
            icon="flask-outline"
            message={t('merchant.scan.demoCodes', { codes: DEMO_SEEDED_PICKUP_CODES.join(', ') })}
          />
        ) : null}
      </View>
    );
  } else {
    body = (
      <View style={styles.flex}>
        {focused ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => run({ token: data })}
          />
        ) : null}
        <View style={styles.pad}>
          <Button
            label={t('merchant.scan.enterCode')}
            variant="secondary"
            icon="keypad-outline"
            onPress={() => setManual(true)}
            fullWidth
          />
        </View>
      </View>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <TabHeader title={t('merchant.scan.title')} />
      <View style={styles.flex}>{body}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: spacing.lg, gap: spacing.lg },
  camera: { flex: 1, marginHorizontal: spacing.lg, borderRadius: radius.lg, overflow: 'hidden' },
  result: {
    flex: 1,
    margin: spacing.lg,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xxl,
  },
});
