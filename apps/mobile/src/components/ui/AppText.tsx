import { Text, type TextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/design/tokens';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
};

const weightFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export function AppText({
  variant = 'body',
  color = colors.textPrimary,
  align,
  weight,
  style,
  ...rest
}: Props) {
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        { color },
        align ? { textAlign: align } : null,
        weight ? { fontFamily: weightFamily[weight] } : null,
        style,
      ]}
    />
  );
}
