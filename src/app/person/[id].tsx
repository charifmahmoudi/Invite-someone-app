import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ActivityCard } from '@/components/activity-card';
import { AppIcon } from '@/components/ui/app-icon';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/chip';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ScrollScreen } from '@/components/ui/screen';
import { palette, radius, shadow, spacing, typography } from '@/constants/theme';
import { useApp, useCurrentProfile } from '@/state/app-context';

export default function PersonDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, sendInvitations, toggleSavedActivity } = useApp();
  const currentProfile = useCurrentProfile();
  const profile = state.profiles.find((candidate) => candidate.id === id);
  const [referenceTime] = useState(() => Date.now());

  if (!state.hydrated) return null;
  if (!state.session) return <Redirect href="/(auth)/welcome" />;

  if (!profile) {
    return (
      <ScrollScreen>
        <ScreenHeader onBack={() => router.back()} title="Profile" />
        <Text style={styles.notFound}>This profile could not be found.</Text>
      </ScrollScreen>
    );
  }

  const sharedInterests = profile.interests.filter((interest) =>
    currentProfile?.interests.includes(interest),
  );
  const hosted = state.activities.filter(
    (activity) =>
      activity.hostId === profile.id && new Date(activity.startAt).getTime() > referenceTime,
  );
  const myHosted = state.activities.filter(
    (activity) =>
      activity.hostId === state.session?.userId &&
      new Date(activity.startAt).getTime() > referenceTime &&
      !activity.invitedIds.includes(profile.id),
  );

  const invite = (activityId: string) => {
    const activity = state.activities.find((candidate) => candidate.id === activityId);
    if (!activity) return;
    Alert.alert(
      `Invite ${profile.name.split(' ')[0]}?`,
      `Send an invitation to “${activity.title}”?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send invitation',
          onPress: () => {
            void sendInvitations({
              activityId,
              receiverIds: [profile.id],
              message: `This made me think of you — would you like to join?`,
            })
              .then(() =>
                Alert.alert(
                  'Invitation sent',
                  `${profile.name.split(' ')[0]} can respond whenever they are ready.`,
                ),
              )
              .catch((error: unknown) =>
                Alert.alert(
                  'Unable to send',
                  error instanceof Error ? error.message : 'Please try again.',
                ),
              );
          },
        },
      ],
    );
  };

  return (
    <ScrollScreen contentContainerStyle={styles.scroll}>
      <ScreenHeader onBack={() => router.back()} title="Profile" />
      <View style={styles.content}>
        <View style={styles.hero}>
          <Avatar profile={profile} size={96} />
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}</Text>
            {profile.isVerified ? <AppIcon name="shield" color={palette.forest} size={22} /> : null}
          </View>
          <Text style={styles.handle}>
            @{profile.handle} · {profile.approximateLocation?.area ?? profile.city}
          </Text>
          {profile.approximateLocation ? (
            <View style={styles.approximateArea}>
              <AppIcon name="shield" color={palette.forest} size={15} />
              <Text style={styles.approximateAreaText}>Approximate area for privacy</Text>
            </View>
          ) : null}
          <Text style={styles.headline}>{profile.headline}</Text>
          <Text style={styles.bio}>{profile.bio}</Text>
          <View style={styles.stats}>
            <Pill label={`${profile.reliabilityScore}% reliable`} tone="success" />
            <Pill label={`${profile.completedActivities} plans joined`} />
          </View>
        </View>

        {sharedInterests.length > 0 ? (
          <View style={styles.compatibility}>
            <AppIcon name="sparkles" color={palette.primaryDark} size={24} />
            <View style={styles.compatibilityCopy}>
              <Text style={styles.compatibilityTitle}>
                You have {sharedInterests.length} shared interest
                {sharedInterests.length === 1 ? '' : 's'}
              </Text>
              <Text style={styles.compatibilityBody}>{sharedInterests.join(', ')}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enjoys</Text>
          <View style={styles.pills}>
            {profile.interests.map((interest) => (
              <Pill key={interest} label={interest} />
            ))}
          </View>
        </View>

        <View style={styles.sectionGrid}>
          <View style={styles.infoCard}>
            <AppIcon name="clock" color={palette.forest} size={22} />
            <Text style={styles.infoTitle}>Usually free</Text>
            <Text style={styles.infoBody}>{profile.availability.join(' · ')}</Text>
          </View>
          <View style={styles.infoCard}>
            <AppIcon name="heart" color={palette.forest} size={22} />
            <Text style={styles.infoTitle}>Looking for</Text>
            <Text style={styles.infoBody}>{profile.connectionGoals.join(' · ')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invite to one of my plans</Text>
          {myHosted.length > 0 ? (
            <View style={styles.myPlans}>
              {myHosted.map((activity) => (
                <View key={activity.id} style={styles.planRow}>
                  <View style={styles.planCopy}>
                    <Text style={styles.planTitle}>{activity.title}</Text>
                    <Text style={styles.planMeta}>
                      {activity.category} · {activity.attendeeIds.length}/{activity.capacity} going
                    </Text>
                  </View>
                  <Button
                    fullWidth={false}
                    label="Invite"
                    onPress={() => invite(activity.id)}
                    variant="outline"
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.createPrompt}>
              <Text style={styles.createText}>
                Create a plan first, then send a thoughtful invitation.
              </Text>
              <Button
                fullWidth={false}
                icon="plus"
                label="Create a plan"
                onPress={() => router.push('/create')}
              />
            </View>
          )}
        </View>

        {hosted.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plans {profile.name.split(' ')[0]} hosts</Text>
            <View style={styles.activities}>
              {hosted.map((activity) => (
                <ActivityCard
                  activity={activity}
                  attendees={activity.attendeeIds
                    .map((attendeeId) =>
                      state.profiles.find((candidate) => candidate.id === attendeeId),
                    )
                    .filter((candidate) => candidate !== undefined)}
                  host={profile}
                  key={activity.id}
                  onPress={() =>
                    router.push({ pathname: '/activity/[id]', params: { id: activity.id } })
                  }
                  onToggleSaved={() => void toggleSavedActivity(activity.id)}
                  saved={state.savedActivityIds.includes(activity.id)}
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge },
  content: { paddingHorizontal: spacing.lg, gap: spacing.xxl },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: palette.surface,
    padding: spacing.xxl,
    ...shadow.card,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  name: { ...typography.h1, color: palette.ink },
  handle: { ...typography.small, color: palette.inkMuted },
  approximateArea: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  approximateAreaText: { ...typography.micro, color: palette.forest },
  headline: { ...typography.h3, color: palette.ink, textAlign: 'center', marginTop: spacing.sm },
  bio: { ...typography.body, color: palette.inkMuted, textAlign: 'center' },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  compatibility: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FEF3EF',
    padding: spacing.lg,
  },
  compatibilityCopy: { flex: 1, gap: 2 },
  compatibilityTitle: { ...typography.bodyStrong, color: palette.ink },
  compatibilityBody: { ...typography.small, color: palette.primaryDark },
  section: { gap: spacing.lg },
  sectionTitle: { ...typography.h2, color: palette.ink },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sectionGrid: { flexDirection: 'row', gap: spacing.md },
  infoCard: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: palette.forestSoft,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  infoTitle: { ...typography.label, color: palette.forest },
  infoBody: { ...typography.small, color: palette.inkMuted },
  myPlans: { gap: spacing.md },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.lg,
  },
  planCopy: { flex: 1, gap: 3 },
  planTitle: { ...typography.bodyStrong, color: palette.ink },
  planMeta: { ...typography.small, color: palette.inkMuted },
  createPrompt: {
    alignItems: 'center',
    gap: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.xxl,
  },
  createText: { ...typography.body, color: palette.inkMuted, textAlign: 'center' },
  activities: { gap: spacing.lg },
  notFound: {
    ...typography.body,
    color: palette.inkMuted,
    textAlign: 'center',
    margin: spacing.xxxl,
  },
});
