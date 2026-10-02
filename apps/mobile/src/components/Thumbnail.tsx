import type { ImageSet } from '@mawjood/contracts';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useCategoryIcon } from '@/api/categoryLookup';
import { colors, radius } from '@/design/tokens';
import { storeInitials } from '@/lib/categoryIcon';

import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

export const THUMBNAIL_SIZE = 56;

/**
 * 56 dp rounded square at the start of list rows. Decorative (the row carries the label):
 * the image when there is one, otherwise the category icon, otherwise the store's initials.
 */
export function Thumbnail({
  image,
  categoryId,
  name,
}: {
  image?: ImageSet | null;
  categoryId?: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  const icon = useCategoryIcon(categoryId);
  if (image && !failed) {
    return (
      <Image
        source={{ uri: image.thumbUrl }}
        placeholder={image.blurhash ? { blurhash: image.blurhash } : undefined}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={image.thumbUrl}
        onError={() => setFailed(true)}
        accessible={false}
        style={styles.box}
      />
    );
  }
  return (
    <View
      style={[styles.box, styles.placeholder]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {categoryId ? (
        <Icon name={icon} size={24} color={colors.textTertiary} />
      ) : (
        <AppText variant="callout" weight="semibold" color={colors.textSecondary}>
          {storeInitials(name)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, borderRadius: radius.md },
  placeholder: {
    backgroundColor: colors.bgSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
