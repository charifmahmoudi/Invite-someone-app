import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/theme';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
}

export const InputField = forwardRef<TextInput, InputFieldProps>(function InputField(
  { label, error, hint, multiline, style, ...props },
  ref,
) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={palette.inkMuted}
        selectionColor={palette.primary}
        style={[styles.input, multiline && styles.multiline, error && styles.inputError, style]}
        {...props}
      />
      {error || hint ? (
        <Text style={[styles.helper, error && styles.error]}>{error ?? hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  label: { ...typography.label, color: palette.ink },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    color: palette.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
  },
  multiline: { minHeight: 112, textAlignVertical: 'top' },
  inputError: { borderColor: palette.error },
  helper: { ...typography.small, color: palette.inkMuted },
  error: { color: palette.error },
});
