import { InviteStaffRequest } from '@mazal/contracts';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useInviteStaff, useStaff } from '@/api/merchantHooks';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Divider, Group, Screen } from '@/components/ui/Layout';
import { ListRow } from '@/components/ui/ListRow';
import { ErrorState, ListSkeleton } from '@/components/ui/StateViews';
import { TextField } from '@/components/ui/TextField';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useMerchantContext } from '@/state/merchantContext';

export default function StaffScreen() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { context } = useMerchantContext();
  const businessId = context?.business.id ?? '';
  const staff = useStaff(context?.business.id);
  const invite = useInviteStaff(businessId);
  const [email, setEmail] = useState('');
  const valid = InviteStaffRequest.safeParse({ email: email.trim() }).success;

  return (
    <Screen scroll>
      {staff.isPending ? (
        <ListSkeleton rows={2} rowHeight={56} />
      ) : staff.isError ? (
        <ErrorState
          error={staff.error}
          onRetry={() => void staff.refetch()}
          retrying={staff.isRefetching}
        />
      ) : (
        <Group>
          {staff.data.map((m, i) => (
            <View key={m.userId}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                icon="person-outline"
                title={m.displayName}
                subtitle={`${m.email} · ${t(`merchant.roles.${m.role}`)}`}
              />
            </View>
          ))}
        </Group>
      )}
      <AppText variant="headline">{t('merchant.invite')}</AppText>
      {invite.isSuccess ? <Banner tone="success" message={t('merchant.invited')} /> : null}
      {invite.isError ? <Banner tone="error" message={errorMessage(invite.error)} /> : null}
      <TextField
        label={t('merchant.inviteEmail')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        error={email.length > 0 && !valid ? t('validation.email') : undefined}
      />
      <Button
        label={t('merchant.invite')}
        disabled={!valid || !businessId}
        loading={invite.isPending}
        onPress={() => invite.mutate({ email: email.trim() }, { onSuccess: () => setEmail('') })}
        fullWidth
      />
    </Screen>
  );
}
