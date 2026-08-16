import { StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/theme';
import { AppIcon } from '@/components/ui/app-icon';
import { PressableScale } from '@/components/ui/pressable-scale';

export function Pill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'success';
}) {
  const colors =
    tone === 'accent'
      ? { background: '#FCE8E2', text: palette.primaryDark }
      : tone === 'success'
        ? { background: palette.forestSoft, text: palette.forest }
        : { background: palette.surfaceMuted, text: palette.inkMuted };
  return (
    <View style={[styles.pill, { backgroundColor: colors.background }]}>
      <Text style={[styles.pillText, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

interface ChoiceChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function ChoiceChip({ label, selected, onPress, disabled }: ChoiceChipProps) {
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      haptic
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      {selected ? <AppIcon name="check" size={15} color={palette.white} /> : null}
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  pillText: typography.label,
  choice: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  choiceSelected: { backgroundColor: palette.forest, borderColor: palette.forest },
  choiceText: { ...typography.small, color: palette.ink },
  choiceTextSelected: { color: palette.white, fontWeight: '700' },
});
