import type { PickupPass } from '@mazal/contracts';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { colors, fontFamily, radius, spacing } from '@/design/tokens';

import { AppText } from './ui/AppText';

/** High-contrast QR code with the short code as a typed fallback. Works offline once loaded. */
export function QRPass({ pass, storeName }: { pass: PickupPass; storeName: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <AppText variant="title2" align="center" accessibilityRole="header">
        {t('orders.passTitle')}
      </AppText>
      <AppText variant="subhead" color={colors.textSecondary} align="center">
        {storeName}
      </AppText>
      <View
        style={styles.qr}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${t('orders.passTitle')}. ${t('orders.code')}: ${pass.code.split('').join(' ')}`}
      >
        <QRCode
          value={pass.token}
          size={220}
          color={colors.textPrimary}
          backgroundColor={colors.bgSurface}
          quietZone={12}
        />
      </View>
      <AppText variant="footnote" color={colors.textSecondary} align="center">
        {t('orders.code')}
      </AppText>
      <AppText align="center" selectable style={styles.code}>
        {pass.code}
      </AppText>
      <AppText variant="footnote" color={colors.textSecondary} align="center">
        {t('orders.passHint')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    padding: spacing.xxxl,
    gap: spacing.sm,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderInput,
  },
  qr: { padding: spacing.sm, backgroundColor: colors.bgSurface },
  code: { fontFamily: fontFamily.bold, fontSize: 32, lineHeight: 40, letterSpacing: 8 },
});
