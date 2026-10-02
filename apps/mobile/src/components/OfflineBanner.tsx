import { useNetworkState } from 'expo-network';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/design/tokens';

import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

/** Shown on every screen while the device reports no connection. */
export function OfflineBanner() {
  const { t } = useTranslation();
  const network = useNetworkState();
  if (network.isConnected !== false) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="cloud-offline-outline" size={16} color={colors.textOnInverse} />
      <AppText variant="footnote" color={colors.textOnInverse} style={styles.text}>
        {t('states.offlineBanner')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgInverse,
  },
  text: { flex: 1 },
});
