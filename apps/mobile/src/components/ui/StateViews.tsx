import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radius, spacing } from '@/design/tokens';
import { useErrorMessage } from '@/lib/useErrorMessage';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

type EmptyProps = {
  icon?: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon = 'leaf-outline',
  title,
  body,
  actionLabel,
  onAction,
}: EmptyProps) {
  return (
    <View style={styles.container} accessibilityRole="summary">
      <View style={styles.iconWrap}>
        <Icon name={icon} size={32} color={colors.textTertiary} />
      </View>
      <AppText variant="headline" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="subhead" color={colors.textSecondary} align="center">
          {body}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <View>
          <Button label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

type ErrorProps = { error: unknown; onRetry?: () => void; retrying?: boolean };

export function ErrorState({ error, onRetry, retrying }: ErrorProps) {
  const { t } = useTranslation();
  const message = useErrorMessage()(error);
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={[styles.iconWrap, styles.errorIcon]}>
        <Icon name="cloud-offline-outline" size={32} color={colors.errorFg} />
      </View>
      <AppText variant="headline" align="center">
        {message}
      </AppText>
      {onRetry ? (
        <View>
          <Button
            label={t('common.retry')}
            onPress={onRetry}
            loading={retrying}
            icon="refresh-outline"
            variant="secondary"
          />
        </View>
      ) : null}
    </View>
  );
}

/** Skeleton block. Static (no shimmer) so it respects reduced motion by default. */
export function Skeleton({
  height,
  width = '100%',
  rounded = radius.md,
}: {
  height: number;
  width?: number | `${number}%`;
  rounded?: number;
}) {
  return (
    <View style={{ height, width, borderRadius: rounded, backgroundColor: colors.skeleton }} />
  );
}

export function ListSkeleton({ rows = 4, rowHeight = 96 }: { rows?: number; rowHeight?: number }) {
  const { t } = useTranslation();
  return (
    <View style={styles.skeletonList} accessibilityLabel={t('common.loading')} accessible>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={rowHeight} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.huge,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: { backgroundColor: colors.errorBg },
  skeletonList: { gap: spacing.md, padding: spacing.lg },
});
