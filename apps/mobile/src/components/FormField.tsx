import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import type { TextInputProps } from 'react-native';

import { TextField } from './ui/TextField';

type Props<T extends FieldValues> = Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur'> & {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  /** Translated message shown when the field is invalid (never raw validator text). */
  errorMessage: string;
  helper?: string;
  password?: boolean;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
};

/** TextField bound to react-hook-form. Values are strings; parsing happens in the form schema. */
export function FormField<T extends FieldValues>({
  control,
  name,
  errorMessage,
  ...rest
}: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...rest}
          value={typeof field.value === 'string' ? field.value : String(field.value ?? '')}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error ? errorMessage : undefined}
        />
      )}
    />
  );
}
