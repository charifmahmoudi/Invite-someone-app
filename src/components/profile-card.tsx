import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Pill } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { AppIcon } from '@/components/ui/app-icon';
import { palette, radius, shadow, spacing, typography } from '@/constants/theme';
import type { Profile } from '@/types/domain';

interface ProfileCardProps {
  profile: Profile;
  onPress: () => void;
  reasons?: string[];
  trailing?: React.ReactNode;
  selected?: boolean;
}

export function ProfileCard({
  profile,
  onPress,
  reasons = [],
  trailing,
  selected,
}: ProfileCardProps) {
  return (
    <PressableScale
      accessibilityLabel={`View ${profile.name}'s profile`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.card, selected && styles.selected]}
    >
      <View style={styles.header}>
        <Avatar profile={profile} size={54} />
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={styles.name}>
              {profile.name}
            </Text>
            {profile.isVerified ? <AppIcon name="shield" size={16} color={palette.forest} /> : null}
          </View>
          <Text numberOfLines={1} style={styles.location}>
            {profile.city} · {profile.reliabilityScore}% reliable
          </Text>
        </View>
        {trailing ?? <AppIcon name="chevron-right" size={20} color={palette.inkMuted} />}
      </View>
      <Text numberOfLines={2} style={styles.headline}>
        {profile.headline}
      </Text>
      <View style={styles.pills}>
        {(reasons.length > 0 ? reasons : profile.interests.slice(0, 3)).map((reason) => (
          <Pill key={reason} label={reason} tone={reasons.length > 0 ? 'success' : 'neutral'} />
        ))}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  selected: { borderColor: palette.forest, backgroundColor: '#F4F9F6' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identity: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { ...typography.h3, color: palette.ink, flexShrink: 1 },
  location: { ...typography.small, color: palette.inkMuted },
  headline: { ...typography.body, color: palette.ink },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
