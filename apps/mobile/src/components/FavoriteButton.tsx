import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useToggleFavorite } from '@/api/hooks';
import { colors } from '@/design/tokens';
import { useSession } from '@/state/session';

import { IconButton } from './ui/IconButton';

export function FavoriteButton({
  storeId,
  isFavorite,
  floating = false,
}: {
  storeId: string;
  isFavorite: boolean;
  /** Round white button with a shadow, for use over images. */
  floating?: boolean;
}) {
  const { t } = useTranslation();
  const signedIn = useSession((s) => s.status === 'signedIn');
  const toggle = useToggleFavorite();
  const pendingValue = toggle.isPending ? toggle.variables?.favorite : undefined;
  const shown = pendingValue ?? isFavorite;
  return (
    <IconButton
      icon={shown ? 'heart' : 'heart-outline'}
      color={colors.icon}
      selected={shown}
      background={floating}
      accessibilityLabel={shown ? t('favorites.remove') : t('favorites.add')}
      onPress={() => {
        if (!signedIn) {
          router.push('/sign-in');
          return;
        }
        if (!toggle.isPending) toggle.mutate({ storeId, favorite: !shown });
      }}
    />
  );
}
