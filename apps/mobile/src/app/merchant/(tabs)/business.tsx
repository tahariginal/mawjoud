import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { TabHeader } from '@/components/TabHeader';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Card, Divider, Group, Screen } from '@/components/ui/Layout';
import { ListRow } from '@/components/ui/ListRow';
import { ListSkeleton } from '@/components/ui/StateViews';
import { colors, spacing } from '@/design/tokens';
import { currentLocale } from '@/i18n';
import { useMerchantContext } from '@/state/merchantContext';
import { useSession } from '@/state/session';

function weekdayName(weekday: number, locale: string): string {
  // 2024-01-07 was a Sunday (weekday 0).
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2024, 0, 7 + weekday)),
  );
}

export default function BusinessScreen() {
  const { t } = useTranslation();
  const setMode = useSession((s) => s.setMode);
  const { context } = useMerchantContext();
  const locale = currentLocale();
  if (!context) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <ListSkeleton />
      </Screen>
    );
  }
  const { business, role } = context;

  return (
    <Screen scroll edges={['top', 'left', 'right']} contentContainerStyle={styles.content}>
      <TabHeader title={t('merchant.businessTitle')} />
      <View style={styles.pad}>
        <AppText variant="title2">{business.name}</AppText>
        <AppText variant="subhead" color={colors.textSecondary}>
          {t(`merchant.roles.${role}`)}
        </AppText>
      </View>

      <View style={styles.pad}>
        <AppText variant="headline">{t('merchant.locations')}</AppText>
        {business.locations.map((loc) => (
          <Card key={loc.id}>
            <AppText variant="headline">{loc.name}</AppText>
            <AppText variant="subhead" color={colors.textSecondary}>
              {loc.address.line1}, {loc.address.city}
            </AppText>
            <AppText variant="subhead" weight="semibold">
              {t('merchant.hours')}
            </AppText>
            {[...loc.hours]
              .sort((a, b) => a.weekday - b.weekday)
              .map((h) => (
                <View key={h.weekday} style={styles.hours}>
                  <AppText variant="subhead" style={styles.flex}>
                    {weekdayName(h.weekday, locale)}
                  </AppText>
                  <AppText variant="subhead">
                    {h.opensAt}–{h.closesAt}
                  </AppText>
                </View>
              ))}
          </Card>
        ))}
        {/* PLACEHOLDER: editing locations/hours arrives with the merchant API (Phase 8). */}
        <Banner tone="info" message={t('merchant.editPending')} />
      </View>

      <View style={styles.pad}>
        <Group>
          {role === 'OWNER' ? (
            <>
              <ListRow
                icon="people-outline"
                title={t('merchant.staff')}
                onPress={() => router.push('/merchant/staff')}
              />
              <Divider />
            </>
          ) : null}
          <ListRow
            icon="swap-horizontal-outline"
            title={t('merchant.switchToCustomer')}
            onPress={() => {
              setMode('customer');
              router.replace('/home');
            }}
          />
        </Group>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 0, gap: spacing.xl },
  pad: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  hours: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
