import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useLogout } from '@/api/authHooks';
import { DemoBadge } from '@/components/StatusBadges';
import { TabHeader } from '@/components/TabHeader';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Divider, Group, Screen } from '@/components/ui/Layout';
import { ListRow } from '@/components/ui/ListRow';
import { env } from '@/config/env';
import { colors, spacing } from '@/design/tokens';
import { isMerchant, useSession } from '@/state/session';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { me, status, setMode } = useSession();
  const logout = useLogout();

  return (
    <Screen scroll edges={['top', 'left', 'right']} contentContainerStyle={styles.content}>
      <TabHeader title={t('profile.title')} right={<DemoBadge />} />

      {env.apiMode === 'demo' ? (
        <View style={styles.pad}>
          <Banner tone="warning" icon="flask-outline" message={t('common.demoNotice')} />
        </View>
      ) : null}

      {status === 'signedIn' && me ? (
        <View style={styles.pad}>
          <AppText variant="title2">{me.displayName}</AppText>
          <AppText variant="subhead" color={colors.textSecondary}>
            {me.email}
          </AppText>
        </View>
      ) : (
        <View style={[styles.pad, styles.guest]}>
          <AppText variant="title2">{t('profile.guestTitle')}</AppText>
          <AppText variant="body" color={colors.textSecondary}>
            {t('profile.guestBody')}
          </AppText>
          <Button label={t('profile.signIn')} onPress={() => router.push('/sign-in')} fullWidth />
          <Button
            label={t('profile.signUp')}
            onPress={() => router.push('/sign-up')}
            variant="secondary"
            fullWidth
          />
        </View>
      )}

      {status === 'signedIn' ? (
        <View style={styles.pad}>
          <Group>
            <ListRow
              icon="leaf-outline"
              title={t('profile.impact')}
              onPress={() => router.push('/impact')}
            />
          </Group>
        </View>
      ) : null}

      {status === 'signedIn' ? (
        <View style={styles.pad}>
          <AppText
            variant="subhead"
            weight="semibold"
            color={colors.textSecondary}
            style={styles.groupTitle}
          >
            {t('profile.merchantSection')}
          </AppText>
          <Group>
            {isMerchant(me) ? (
              <ListRow
                icon="storefront-outline"
                title={t('profile.switchToMerchant')}
                onPress={() => {
                  setMode('merchant');
                  router.replace('/merchant/today');
                }}
              />
            ) : (
              <ListRow
                icon="storefront-outline"
                title={t('profile.becomeMerchant')}
                onPress={() => router.push('/merchant/apply')}
              />
            )}
          </Group>
        </View>
      ) : null}

      <View style={styles.pad}>
        <AppText
          variant="subhead"
          weight="semibold"
          color={colors.textSecondary}
          style={styles.groupTitle}
        >
          {t('profile.settings')}
        </AppText>
        <Group>
          {status === 'signedIn' ? (
            <>
              <ListRow
                icon="person-outline"
                title={t('profile.account')}
                onPress={() => router.push('/settings/account')}
              />
              <Divider />
              <ListRow
                icon="notifications-outline"
                title={t('profile.notifications')}
                onPress={() => router.push('/settings/notifications')}
              />
              <Divider />
            </>
          ) : null}
          <ListRow
            icon="language-outline"
            title={t('profile.language')}
            onPress={() => router.push('/settings/language')}
          />
          <Divider />
          <ListRow
            icon="shield-checkmark-outline"
            title={t('profile.privacy')}
            onPress={() => router.push('/settings/privacy')}
          />
        </Group>
      </View>

      <View style={styles.pad}>
        <Group>
          <ListRow
            icon="help-circle-outline"
            title={t('profile.help')}
            onPress={() => router.push('/help')}
          />
          <Divider />
          <ListRow
            icon="document-text-outline"
            title={t('profile.terms')}
            onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })}
          />
          <Divider />
          <ListRow
            icon="document-text-outline"
            title={t('profile.privacyPolicy')}
            onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })}
          />
        </Group>
      </View>

      {status === 'signedIn' ? (
        <View style={styles.pad}>
          <Group>
            <ListRow
              icon="log-out-outline"
              title={t('profile.signOut')}
              onPress={() => logout.mutate()}
              showChevron={false}
            />
            <Divider />
            <ListRow
              icon="trash-outline"
              title={t('profile.deleteAccount')}
              destructive
              onPress={() => router.push('/settings/delete-account')}
            />
          </Group>
        </View>
      ) : null}

      <AppText variant="footnote" color={colors.textSecondary} align="center">
        {t('profile.version', { version: env.appVersion })}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 0, gap: spacing.xl },
  pad: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  guest: { gap: spacing.md },
  groupTitle: { paddingBottom: spacing.xs },
});
