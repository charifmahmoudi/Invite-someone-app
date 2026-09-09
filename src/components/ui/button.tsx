import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/theme';
import { AppIcon, type AppIconName } from '@/components/ui/app-icon';
import { PressableScale } from '@/components/ui/pressable-scale';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: AppIconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

const stylesByVariant: Record<ButtonVariant, { background: string; text: string; border: string }> =
  {
    primary: { background: palette.primary, text: palette.white, border: palette.primary },
    secondary: { background: palette.forest, text: palette.white, border: palette.forest },
    outline: { background: palette.surface, text: palette.ink, border: palette.border },
    ghost: { background: 'transparent', text: palette.forest, border: 'transparent' },
    danger: { background: '#FBEAE8', text: palette.error, border: '#F4D1CD' },
  };

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const colors = stylesByVariant[variant];
  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled || loading}
      haptic
      onPress={onPress}
      testID={testID}
      style={[
        styles.button,
        !fullWidth && styles.fit,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <View style={styles.content}>
          {icon ? <AppIcon name={icon} size={19} color={colors.text} /> : null}
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
  },
  fit: { alignSelf: 'flex-start' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: typography.bodyStrong,
});
