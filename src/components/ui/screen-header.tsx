import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { palette, spacing, typography } from '@/constants/theme';

interface ScreenHeaderProps {
  title?: string;
  eyebrow?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, eyebrow, onBack, right }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <PressableScale accessibilityLabel="Go back" onPress={onBack} style={styles.iconButton}>
          <AppIcon name="back" size={22} color={palette.ink} />
        </PressableScale>
      ) : (
        <View style={styles.spacer} />
      )}
      <View style={styles.titleWrap}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        {title ? (
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        ) : null}
      </View>
      {right ?? <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  spacer: { width: 42 },
  titleWrap: { flex: 1, alignItems: 'center' },
  eyebrow: { ...typography.micro, color: palette.inkMuted, textTransform: 'uppercase' },
  title: { ...typography.h3, color: palette.ink },
});
