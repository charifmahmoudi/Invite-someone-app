import { StyleSheet, Text, View } from 'react-native';

import { palette, typography } from '@/constants/theme';
import { PressableScale } from '@/components/ui/pressable-scale';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction ? (
        <PressableScale onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.h2, color: palette.ink },
  action: { paddingVertical: 8, paddingLeft: 12 },
  actionText: { ...typography.label, color: palette.primaryDark },
});
