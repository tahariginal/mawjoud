import { Children, Fragment, useContext, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, elevation, spacing } from '@/design/tokens';

import { AppText } from './AppText';
import { FooterContext, GroupContext } from './context';
import { Icon } from './Icon';
import { OfflineBanner } from '../OfflineBanner';

type ScreenProps = {
  children: ReactNode;
  /** Wrap content in a ScrollView. */
  scroll?: boolean;
  edges?: Edge[];
  footer?: ReactNode;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  refreshControl?: ScrollViewProps['refreshControl'];
  testID?: string;
};

/** Standard screen: safe area, app background, offline banner, optional sticky footer. */
export function Screen({
  children,
  scroll = false,
  edges = ['left', 'right'],
  footer,
  contentContainerStyle,
  refreshControl,
  testID,
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.screen} edges={edges} testID={testID}>
      <OfflineBanner />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{children}</View>
      )}
      {footer ? (
        <FooterContext.Provider value>
          <View style={styles.footer}>{footer}</View>
        </FooterContext.Provider>
      ) : null}
    </SafeAreaView>
  );
}

/**
 * A content section. Flat: no background, border or shadow — sections are separated by
 * spacing and dividers. Pressable sections dim while pressed.
 */
export function Card({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={styles.card}>{children}</View>;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="title2" accessibilityRole="header" style={styles.flex}>
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={12}
          style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}
        >
          <AppText variant="subhead" weight="semibold">
            {actionLabel}
          </AppText>
          <Icon name="chevron-forward" size={16} color={colors.textPrimary} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Flat sections stacked with hairline dividers between them — the replacement for stacked
 * cards. Empty children (null/false) are skipped, so conditional sections need no wrapper.
 */
export function Sections({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <View>
      {items.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? <Divider /> : null}
          <View style={styles.sectionItem}>{child}</View>
        </Fragment>
      ))}
    </View>
  );
}

/** Hairline separator. Inside a Group it spans the group, so it lines up with row text. */
export function Divider() {
  return <View style={styles.divider} />;
}

export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const inGroup = useContext(GroupContext);
  return (
    <View style={[styles.switchRow, inGroup && styles.rowInGroup]}>
      <View style={styles.flex}>
        <AppText variant="body">{label}</AppText>
        {description ? (
          <AppText variant="footnote" color={colors.textSecondary}>
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ true: colors.actionPrimaryBg, false: colors.controlOff }}
        thumbColor={colors.bgSurface}
        ios_backgroundColor={colors.controlOff}
      />
    </View>
  );
}

/** Rows grouped like a settings list: flat, hairline dividers, no card around them. */
export function Group({ children }: { children: ReactNode }) {
  return (
    <GroupContext.Provider value>
      <View style={styles.group}>{children}</View>
    </GroupContext.Provider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  flex: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.xxl, paddingBottom: spacing.huge },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.bgSurface,
    ...elevation.raised,
  },
  card: { gap: spacing.md },
  pressed: { opacity: 0.6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: 24,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderDivider },
  sectionItem: { paddingVertical: spacing.xl },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgSurface,
  },
  rowInGroup: { paddingHorizontal: 0 },
  group: { backgroundColor: colors.bgSurface },
});
