import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActivityCard } from '@/components/activity-card';
import { AppIcon } from '@/components/ui/app-icon';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChoiceChip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { useApp, useCurrentProfile } from '@/state/app-context';
import { ACTIVITY_CATEGORIES, type ActivityCategory } from '@/types/domain';

export default function HomeScreen() {
  const router = useRouter();
  const { state, toggleSavedActivity } = useApp();
  const currentProfile = useCurrentProfile();
  const [category, setCategory] = useState<ActivityCategory | 'All'>('All');
  const [referenceTime] = useState(() => Date.now());

  const pendingInvitations = state.invitations.filter(
    (invitation) =>
      invitation.receiverId === state.session?.userId && invitation.status === 'pending',
  );

  const upcoming = useMemo(
    () =>
      state.activities
        .filter(
          (activity) =>
            new Date(activity.startAt).getTime() > referenceTime &&
            (activity.attendeeIds.includes(state.session?.userId ?? '') ||
              state.invitations.some(
                (invitation) =>
                  invitation.activityId === activity.id &&
                  invitation.receiverId === state.session?.userId &&
                  invitation.status === 'accepted',
              )),
        )
        .sort((left, right) => left.startAt.localeCompare(right.startAt)),
    [referenceTime, state.activities, state.invitations, state.session?.userId],
  );

  const discover = useMemo(
    () =>
      state.activities
        .filter(
          (activity) =>
            new Date(activity.startAt).getTime() > referenceTime &&
            (activity.visibility === 'community' ||
              activity.hostId === state.session?.userId ||
              activity.invitedIds.includes(state.session?.userId ?? '')) &&
            (category === 'All' || activity.category === category),
        )
        .sort((left, right) => left.startAt.localeCompare(right.startAt)),
    [category, referenceTime, state.activities, state.session?.userId],
  );

  const openActivity = (id: string) => router.push({ pathname: '/activity/[id]', params: { id } });

  const cardFor = (activity: (typeof state.activities)[number], compact = false) => (
    <ActivityCard
      activity={activity}
      attendees={activity.attendeeIds
        .map((id) => state.profiles.find((profile) => profile.id === id))
        .filter((profile) => profile !== undefined)}
      compact={compact}
      host={state.profiles.find((profile) => profile.id === activity.hostId)}
      key={activity.id}
      onPress={() => openActivity(activity.id)}
      onToggleSaved={() => void toggleSavedActivity(activity.id)}
      saved={state.savedActivityIds.includes(activity.id)}
    />
  );

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hi {currentProfile?.name.split(' ')[0] ?? 'there'} 👋
            </Text>
            <Text style={styles.heading}>What sounds good?</Text>
          </View>
          <PressableScale
            accessibilityLabel="Open your profile"
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Avatar profile={currentProfile} size={48} />
          </PressableScale>
        </View>

        <View style={styles.createCard}>
          <View style={styles.createCopy}>
            <View style={styles.sparkle}>
              <AppIcon name="sparkles" color={palette.primaryDark} size={21} />
            </View>
            <View style={styles.createText}>
              <Text style={styles.createTitle}>Have an idea?</Text>
              <Text style={styles.createBody}>Make the first move. Keep it small and easy.</Text>
            </View>
          </View>
          <Button
            fullWidth={false}
            icon="plus"
            label="Create"
            onPress={() => router.push('/create')}
          />
        </View>

        {pendingInvitations.length > 0 ? (
          <PressableScale
            accessibilityLabel={`View ${pendingInvitations.length} pending invitations`}
            onPress={() => router.push('/(tabs)/invitations')}
            style={styles.inviteBanner}
          >
            <View style={styles.mailIcon}>
              <AppIcon name="mail" color={palette.white} size={22} />
            </View>
            <View style={styles.inviteText}>
              <Text style={styles.inviteTitle}>
                {pendingInvitations.length} new invitation
                {pendingInvitations.length === 1 ? '' : 's'}
              </Text>
              <Text style={styles.inviteBody}>Someone thought you would make the plan better.</Text>
            </View>
            <AppIcon name="chevron-right" color={palette.white} size={20} />
          </PressableScale>
        ) : null}

        {upcoming.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Coming up" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalCards}
            >
              {upcoming.map((activity) => cardFor(activity, true))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader title="Discover nearby" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            <ChoiceChip
              label="All"
              onPress={() => setCategory('All')}
              selected={category === 'All'}
            />
            {ACTIVITY_CATEGORIES.map((item) => (
              <ChoiceChip
                key={item}
                label={item}
                onPress={() => setCategory(item)}
                selected={category === item}
              />
            ))}
          </ScrollView>
          <View style={styles.cards}>{discover.map((activity) => cardFor(activity))}</View>
          {discover.length === 0 ? (
            <Text style={styles.noResults}>
              No plans in this category yet. You could start the first one.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge, gap: spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  greeting: { ...typography.small, color: palette.inkMuted },
  heading: { ...typography.h1, color: palette.ink, marginTop: 2 },
  createCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F0D8CF',
    backgroundColor: '#FEF3EF',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  createCopy: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sparkle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9DDD4',
  },
  createText: { flex: 1, gap: 2 },
  createTitle: { ...typography.h3, color: palette.ink },
  createBody: { ...typography.small, color: palette.inkMuted },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.forest,
    padding: spacing.lg,
  },
  mailIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteText: { flex: 1, gap: 2 },
  inviteTitle: { ...typography.bodyStrong, color: palette.white },
  inviteBody: { ...typography.small, color: 'rgba(255,255,255,0.75)' },
  section: { gap: spacing.lg },
  horizontalCards: { gap: spacing.md, paddingBottom: spacing.md },
  filters: { gap: spacing.sm, paddingRight: spacing.lg },
  cards: { gap: spacing.lg },
  noResults: {
    ...typography.body,
    color: palette.inkMuted,
    textAlign: 'center',
    padding: spacing.xxl,
  },
});
