import type { ImageSet } from '@mawjood/contracts';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/design/tokens';

import { Icon } from './ui/Icon';

type Props = {
  image: ImageSet | null;
  size: 'thumb' | 'medium' | 'large';
  height: number;
  accessibilityLabel?: string;
};

/** Right-sized image variant with blurhash placeholder; graceful fallback when missing or failing. */
export function OfferImage({ image, size, height, accessibilityLabel }: Props) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  if (!image || failed) {
    return (
      <View
        style={[styles.placeholder, { height }]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('offer.noImage')}
      >
        <Icon name="basket-outline" size={Math.min(40, height / 3)} color={colors.textTertiary} />
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
  },
});
