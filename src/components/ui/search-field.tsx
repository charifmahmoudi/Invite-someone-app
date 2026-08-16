import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { palette, radius, spacing, typography } from '@/constants/theme';

export function SearchField(props: TextInputProps) {
  return (
    <View style={styles.container}>
      <AppIcon name="search" color={palette.inkMuted} size={20} />
      <TextInput
        accessibilityLabel="Search"
        placeholderTextColor={palette.inkMuted}
        selectionColor={palette.primary}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.lg,
  },
  input: { ...typography.body, flex: 1, color: palette.ink, paddingVertical: spacing.md },
});
