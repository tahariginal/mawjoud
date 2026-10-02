import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, CONTROL_HEIGHT, radius, spacing, typography } from '@/design/tokens';

import { AppText } from './AppText';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  helper?: string;
  /** Adds a show/hide toggle for passwords. */
  password?: boolean;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
};

export function TextField({
  label,
  error,
  helper,
  password = false,
  showPasswordLabel = 'Show password',
  hidePasswordLabel = 'Hide password',
  ...inputProps
}: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(password);
  // Filled field: no border at rest (the visible label identifies it), a clear border on
  // focus or error. The border width never changes, so the layout does not jump.
  const borderColor = error ? colors.errorFg : focused ? colors.focusRing : 'transparent';

  return (
    <View style={styles.container}>
      <AppText variant="subhead" weight="medium">
        {label}
      </AppText>
      <View style={[styles.inputRow, { borderColor }]}>
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          secureTextEntry={hidden}
          placeholderTextColor={colors.textSecondary}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={styles.input}
        />
        {password ? (
          <IconButton
            icon={hidden ? 'eye-outline' : 'eye-off-outline'}
            accessibilityLabel={hidden ? showPasswordLabel : hidePasswordLabel}
            onPress={() => setHidden((h) => !h)}
          />
        ) : null}
      </View>
      {error ? (
        <View style={styles.message} accessibilityLiveRegion="polite">
          <Icon name="alert-circle-outline" size={16} color={colors.errorFg} />
          <AppText variant="footnote" color={colors.errorFg} style={styles.flex}>
            {error}
          </AppText>
        </View>
      ) : helper ? (
        <AppText variant="footnote" color={colors.textSecondary}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  inputRow: {
    minHeight: CONTROL_HEIGHT,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.bgSurfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    paddingStart: spacing.lg,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    paddingEnd: spacing.lg,
  },
  message: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  flex: { flex: 1 },
});
