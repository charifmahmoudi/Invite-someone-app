import { StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui/app-icon';
import { palette, radius, spacing, typography } from '@/constants/theme';

interface EmptyStateProps {
  icon?: AppIconName;
  title: string;
  body: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = 'sparkles', title, body, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <AppIcon name={icon} size={30} color={palette.forest} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  icon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.forestSoft,
  },
  title: { ...typography.h3, color: palette.ink, textAlign: 'center' },
  body: { ...typography.body, color: palette.inkMuted, textAlign: 'center', maxWidth: 340 },
});
