import { StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { feedbackColors, radius, spacing, typography } from '@/constants/theme';

type FeedbackTone = keyof typeof feedbackColors;

interface FeedbackBannerProps {
  tone?: FeedbackTone;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

const iconByTone: Record<FeedbackTone, AppIconName> = {
  info: 'info',
  success: 'check',
  warning: 'info',
  error: 'close',
};

export function FeedbackBanner({
  tone = 'info',
  title,
  body,
  actionLabel,
  onAction,
  testID,
}: FeedbackBannerProps) {
  const colors = feedbackColors[tone];

  return (
    <View
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
      style={[styles.banner, { backgroundColor: colors.background, borderColor: colors.border }]}
      testID={testID}
    >
      <View style={styles.row}>
        <View style={[styles.icon, { borderColor: colors.border }]}>
          <AppIcon color={colors.foreground} name={iconByTone[tone]} size={18} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {body ? <Text style={[styles.body, { color: colors.foreground }]}>{body}</Text> : null}
        </View>
      </View>
      {actionLabel && onAction ? (
        <Button fullWidth={false} label={actionLabel} onPress={onAction} variant="ghost" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 3 },
  title: typography.bodyStrong,
  body: typography.small,
});
