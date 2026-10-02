import type { ImageSet } from '@mawjood/contracts';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useCategoryIcon } from '@/api/categoryLookup';
import { colors, spacing } from '@/design/tokens';
import { storeInitials } from '@/lib/categoryIcon';

import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

type Props = {
  image: ImageSet | null;
  size: 'thumb' | 'medium' | 'large';
  height: number;
  accessibilityLabel?: string;
  /** Used by the placeholder: category icon and store initials. */
  categoryId?: string | null;
  storeName?: string;
};

/** Right-sized image variant with blurhash placeholder; graceful fallback when missing or failing. */
export function OfferImage({
  image,
  size,
  height,
  accessibilityLabel,
  categoryId,
  storeName,
}: Props) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const icon = useCategoryIcon(categoryId);
  if (!image || failed) {
    // No photos yet for most offers, so the placeholder is designed, not a gap:
    // the category icon with the store's initials on a quiet grey.
    return (
      <View
        style={[styles.placeholder, { height }]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('offer.noImage')}
      >
        <Icon name={icon} size={Math.min(40, Math.round(height / 4))} color={colors.textTertiary} />
        {storeName ? (
          <AppText
            variant="footnote"
            weight="semibold"
            color={colors.textSecondary}
            style={styles.initials}
          >
            {storeInitials(storeName)}
          </AppText>
        ) : null}
      </View>
    );
  }
  const uri =
    size === 'thumb' ? image.thumbUrl : size === 'medium' ? image.mediumUrl : image.largeUrl;
  return (
    <Image
      source={{ uri }}
      placeholder={image.blurhash ? { blurhash: image.blurhash } : undefined}
      contentFit="cover"
      transition={150}
      cachePolicy="memory-disk"
      recyclingKey={uri}
      onError={() => setFailed(true)}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      style={{ height, width: '100%' }}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    width: '100%',
    backgroundColor: colors.bgSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  initials: { letterSpacing: 1 },
});
