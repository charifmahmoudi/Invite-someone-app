import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { Avatar } from '@/components/ui/avatar';
import { Pill } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { categoryColors, palette, radius, shadow, spacing, typography } from '@/constants/theme';
import type { Activity, Profile } from '@/types/domain';
import { formatActivityDate } from '@/utils/format';

interface ActivityCardProps {
  activity: Activity;
  host?: Profile;
  attendees: Profile[];
  onPress: () => void;
  onToggleSaved?: () => void;
  saved?: boolean;
  compact?: boolean;
}

export function ActivityCard({
  activity,
  host,
  attendees,
  onPress,
  onToggleSaved,
  saved = false,
  compact = false,
}: ActivityCardProps) {
  const colors = categoryColors[activity.category];
  const remaining = Math.max(0, activity.capacity - activity.attendeeIds.length);

  return (
    <PressableScale
      accessibilityLabel={`${activity.title}, ${formatActivityDate(activity.startAt)}`}
      onPress={onPress}
      style={[styles.card, compact && styles.cardCompact]}
    >
      <LinearGradient
        colors={[colors.background, palette.surface]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[styles.visual, compact && styles.visualCompact]}
      >
        <View style={styles.topRow}>
          <Pill label={activity.category} />
          {onToggleSaved ? (
            <PressableScale
              accessibilityLabel={saved ? 'Remove from saved activities' : 'Save activity'}
              haptic
              onPress={onToggleSaved}
              style={styles.saveButton}
            >
              <AppIcon
                name={saved ? 'bookmark-filled' : 'bookmark'}
                color={saved ? palette.primaryDark : palette.ink}
                size={20}
              />
            </PressableScale>
          ) : null}
        </View>

        <View style={styles.dateRow}>
          <View style={[styles.categoryDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.date}>{formatActivityDate(activity.startAt)}</Text>
        </View>
        <Text
          numberOfLines={compact ? 2 : 3}
          style={[styles.title, compact && styles.titleCompact]}
        >
          {activity.title}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        {!compact ? (
          <Text numberOfLines={2} style={styles.description}>
            {activity.description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <AppIcon name="location" color={palette.inkMuted} size={17} />
          <Text numberOfLines={1} style={styles.metaText}>
            {activity.location}
          </Text>
        </View>
        <View style={styles.footer}>
          <View style={styles.peopleRow}>
            <View style={styles.avatarStack}>
              {attendees.slice(0, 3).map((profile, index) => (
                <Avatar
                  key={profile.id}
                  profile={profile}
                  size={30}
                  style={{ marginLeft: index === 0 ? 0 : -9 }}
                />
              ))}
            </View>
            <Text style={styles.hostText}>
              {host
                ? `Hosted by ${host.name.split(' ')[0]}`
                : `${activity.attendeeIds.length} going`}
            </Text>
          </View>
          <Text style={[styles.spots, remaining <= 2 && styles.spotsLimited]}>
            {remaining === 0 ? 'Full' : `${remaining} spot${remaining === 1 ? '' : 's'}`}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...shadow.card,
  },
  cardCompact: { minWidth: 270, maxWidth: 300 },
  visual: { minHeight: 190, justifyContent: 'space-between', padding: spacing.xl },
  visualCompact: { minHeight: 156 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  date: { ...typography.label, color: palette.inkMuted, textTransform: 'uppercase' },
  title: { ...typography.h1, color: palette.ink, marginTop: spacing.sm },
  titleCompact: { ...typography.h2 },
  body: { padding: spacing.xl, gap: spacing.md },
  description: { ...typography.body, color: palette.inkMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { ...typography.small, color: palette.inkMuted, flex: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  peopleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatarStack: { flexDirection: 'row' },
  hostText: { ...typography.small, color: palette.inkMuted, flexShrink: 1 },
  spots: { ...typography.label, color: palette.forest },
  spotsLimited: { color: palette.primaryDark },
});
