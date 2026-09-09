import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { AppIcon } from '@/components/ui/app-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { palette, radius, shadow, spacing, typography } from '@/constants/theme';
import { projectProfilesForMap } from '@/domain/profile-discovery';
import type { Profile } from '@/types/domain';

interface PeopleMapProps {
  profiles: Profile[];
  onSelectProfile: (profile: Profile) => void;
}

export function PeopleMap({ profiles, onSelectProfile }: PeopleMapProps) {
  const points = projectProfilesForMap(profiles);

  if (points.length === 0) {
    return (
      <View style={styles.unavailable}>
        <AppIcon name="location" color={palette.forest} size={26} />
        <Text style={styles.unavailableTitle}>No approximate areas to show</Text>
        <Text style={styles.unavailableBody}>
          Try clearing the distance filter or use list view.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View accessibilityLabel="Approximate map of matching people" style={styles.map}>
        <View style={[styles.road, styles.roadOne]} />
        <View style={[styles.road, styles.roadTwo]} />
        <View style={[styles.road, styles.roadThree]} />
        <View style={styles.park} />
        <Text style={[styles.areaLabel, styles.northLabel]}>NORTH</Text>
        <Text style={[styles.areaLabel, styles.centerLabel]}>CENTRE</Text>
        <Text style={[styles.areaLabel, styles.southLabel]}>SOUTH</Text>

        {points.map(({ profile, x, y }) => {
          const left = `${Math.round(x * 100)}%` as `${number}%`;
          const top = `${Math.round(y * 100)}%` as `${number}%`;
          return (
            <View key={profile.id} style={[styles.pinPosition, { left, top }]}>
              <PressableScale
                accessibilityLabel={`Open ${profile.name}'s profile near ${profile.approximateLocation?.area}`}
                haptic
                onPress={() => onSelectProfile(profile)}
                pressedScale={0.94}
                style={styles.pin}
              >
                <View style={styles.avatarPin}>
                  <Avatar profile={profile} size={50} />
                </View>
                <Text numberOfLines={1} style={styles.pinLabel}>
                  {profile.name.split(' ')[0]}
                </Text>
              </PressableScale>
            </View>
          );
        })}
      </View>
      <View style={styles.privacyRow}>
        <AppIcon name="shield" color={palette.forest} size={17} />
        <Text style={styles.privacyText}>
          Pins represent broad neighbourhood areas—not exact locations.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
  map: {
    height: 430,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#CEDBD2',
    backgroundColor: '#E8EFE9',
    ...shadow.card,
  },
  road: {
    position: 'absolute',
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(206,219,210,0.65)',
  },
  roadOne: { width: '125%', left: '-12%', top: '28%', transform: [{ rotate: '-12deg' }] },
  roadTwo: { width: '130%', left: '-15%', top: '66%', transform: [{ rotate: '16deg' }] },
  roadThree: {
    width: '112%',
    left: '-4%',
    top: '48%',
    transform: [{ rotate: '82deg' }],
  },
  park: {
    position: 'absolute',
    width: 120,
    height: 92,
    right: 18,
    bottom: 24,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(177, 207, 178, 0.62)',
  },
  areaLabel: {
    position: 'absolute',
    ...typography.micro,
    color: 'rgba(49, 92, 76, 0.48)',
  },
  northLabel: { top: spacing.lg, left: spacing.lg },
  centerLabel: { top: '46%', right: spacing.lg },
  southLabel: { bottom: spacing.lg, left: spacing.lg },
  pinPosition: {
    position: 'absolute',
    width: 84,
    transform: [{ translateX: -42 }, { translateY: -28 }],
  },
  pin: { width: 84, alignItems: 'center', gap: 3 },
  avatarPin: {
    borderRadius: radius.pill,
    backgroundColor: palette.white,
    ...shadow.floating,
  },
  pinLabel: {
    ...typography.micro,
    maxWidth: 80,
    color: palette.ink,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  privacyText: { ...typography.small, color: palette.inkMuted, flex: 1 },
  unavailable: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.xxl,
  },
  unavailableTitle: { ...typography.h3, color: palette.ink, textAlign: 'center' },
  unavailableBody: { ...typography.body, color: palette.inkMuted, textAlign: 'center' },
});
