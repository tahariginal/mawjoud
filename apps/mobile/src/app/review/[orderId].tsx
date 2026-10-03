import { ReviewRequest } from '@mazal/contracts';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useReviewOrder } from '@/api/hooks';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Layout';
import { EmptyState } from '@/components/ui/StateViews';
import { TextField } from '@/components/ui/TextField';
import { colors, spacing, TOUCH_TARGET } from '@/design/tokens';
import { useErrorMessage } from '@/lib/useErrorMessage';

export default function ReviewScreen() {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const review = useReviewOrder(orderId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  if (review.isSuccess) {
    return (
      <Screen>
        <EmptyState
          icon="checkmark-circle-outline"
          title={t('review.thanks')}
          actionLabel={t('common.done')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const parsed = ReviewRequest.safeParse({ rating, comment: comment.trim() || undefined });

  return (
    <Screen scroll>
      <AppText variant="headline">{t('review.rating')}</AppText>
      <View style={styles.stars} accessibilityRole="radiogroup">
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            onPress={() => setRating(value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: rating === value }}
            accessibilityLabel={t('review.star', { count: value })}
            style={styles.star}
          >
            <Icon
              name={value <= rating ? 'star' : 'star-outline'}
              size={32}
              color={colors.textPrimary}
            />
          </Pressable>
        ))}
      </View>
      <TextField
        label={`${t('review.comment')} (${t('common.optional')})`}
        value={comment}
        onChangeText={setComment}
        multiline
        maxLength={500}
      />
      {review.isError ? <Banner tone="error" message={errorMessage(review.error)} /> : null}
      <Button
        label={t('review.submit')}
        disabled={!parsed.success}
        loading={review.isPending}
        onPress={() => parsed.success && review.mutate(parsed.data)}
        fullWidth
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', gap: spacing.xs },
  star: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
