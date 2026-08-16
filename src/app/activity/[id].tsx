import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ScrollScreen } from '@/components/ui/screen';
import { categoryColors, palette, radius, shadow, spacing, typography } from '@/constants/theme';
import { useApp } from '@/state/app-context';
import { formatActivityDate } from '@/utils/format';

export default function ActivityDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, joinActivity, respondToInvitation, toggleSavedActivity } = useApp();
  const activity = state.activities.find((candidate) => candidate.id === id);
  const host = state.profiles.find((profile) => profile.id === activity?.hostId);
  const userId = state.session?.userId;
  const invitation = state.invitations.find(
    (candidate) =>
      candidate.activityId === activity?.id &&
      candidate.receiverId === userId &&
      candidate.status === 'pending',
  );

  if (!state.hydrated) return null;
  if (!state.session) return <Redirect href="/(auth)/welcome" />;

  if (!activity || !host) {
    return (
      <ScrollScreen>
        <ScreenHeader onBack={() => router.back()} title="Activity" />
        <Text style={styles.notFound}>This activity is no longer available.</Text>
      </ScrollScreen>
    );
  }

  const attendees = activity.attendeeIds
    .map((attendeeId) => state.profiles.find((profile) => profile.id === attendeeId))
    .filter((profile) => profile !== undefined);
  const isHost = activity.hostId === userId;
  const isAttending = activity.attendeeIds.includes(userId ?? '');
  const isFull = activity.attendeeIds.length >= activity.capacity;
  const saved = state.savedActivityIds.includes(activity.id);
  const colors = categoryColors[activity.category];

  const join = async () => {
    try {
      await joinActivity(activity.id);
      Alert.alert('You’re in', 'The activity is now in your upcoming plans.');
    } catch (error) {
      Alert.alert('Unable to join', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const respond = async (status: 'accepted' | 'declined') => {
    if (!invitation) return;
    try {
      await respondToInvitation(invitation.id, status);
      if (status === 'accepted') Alert.alert('You’re in', 'The host will be happy to see you.');
    } catch (error) {
      Alert.alert(
        'Unable to respond',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  return (
    <ScrollScreen contentContainerStyle={styles.scroll}>
      <ScreenHeader
        onBack={() => router.back()}
        right={
          <PressableScale
            accessibilityLabel={saved ? 'Remove from saved activities' : 'Save activity'}
            haptic
            onPress={() => void toggleSavedActivity(activity.id)}
            style={styles.headerButton}
          >
            <AppIcon
              name={saved ? 'bookmark-filled' : 'bookmark'}
              color={saved ? palette.primaryDark : palette.ink}
              size={21}
            />
          </PressableScale>
        }
      />

      <View style={styles.content}>
        <LinearGradient colors={[colors.background, palette.surface]} style={styles.hero}>
          <View style={styles.heroTop}>
            <Pill label={activity.category} />
            <Pill
              label={activity.visibility === 'invite-only' ? 'Invite-only' : 'Community'}
              tone="accent"
            />
          </View>
          <View>
            <Text style={styles.date}>{formatActivityDate(activity.startAt)}</Text>
            <Text style={styles.title}>{activity.title}</Text>
            <View style={styles.vibeRow}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <Text style={styles.vibe}>
                {activity.vibe} · {activity.capacity} people max
              </Text>
            </View>
          </View>
        </LinearGradient>

        {invitation ? (
          <View style={styles.invitationBox}>
            <View style={styles.inviteHeading}>
              <AppIcon name="mail" color={palette.primaryDark} size={22} />
              <Text style={styles.inviteTitle}>{host.name.split(' ')[0]} invited you</Text>
            </View>
            {invitation.message ? (
              <Text style={styles.inviteMessage}>“{invitation.message}”</Text>
            ) : null}
            <View style={styles.actions}>
              <View style={styles.actionHalf}>
                <Button
                  label="Not this time"
                  onPress={() => void respond('declined')}
                  variant="outline"
                />
              </View>
              <View style={styles.actionHalf}>
                <Button label="I’m in" onPress={() => void respond('accepted')} />
              </View>
            </View>
          </View>
        ) : null}

        {isAttending && !invitation ? (
          <View style={styles.goingBanner}>
            <AppIcon name="check" color={palette.white} size={20} />
            <Text style={styles.goingText}>
              {isHost ? 'You’re hosting this plan' : 'You’re going'}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The plan</Text>
          <Text style={styles.description}>{activity.description}</Text>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <AppIcon name="calendar" color={palette.forest} size={21} />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailLabel}>When</Text>
              <Text style={styles.detailValue}>{formatActivityDate(activity.startAt)}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <AppIcon name="location" color={palette.forest} size={21} />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailLabel}>Where</Text>
              <Text style={styles.detailValue}>{activity.location}</Text>
              <Text style={styles.detailHint}>{activity.city}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hosted by</Text>
          <PressableScale
            onPress={() => router.push({ pathname: '/person/[id]', params: { id: host.id } })}
            style={styles.hostCard}
          >
            <Avatar profile={host} size={58} />
            <View style={styles.hostCopy}>
              <Text style={styles.hostName}>{host.name}</Text>
              <Text style={styles.hostHeadline}>{host.headline}</Text>
              <Text style={styles.reliability}>
                {host.reliabilityScore}% reliable · {host.completedActivities} plans
              </Text>
            </View>
            <AppIcon name="chevron-right" color={palette.inkMuted} size={20} />
          </PressableScale>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Who’s going</Text>
            <Text style={styles.spots}>
              {activity.attendeeIds.length}/{activity.capacity}
            </Text>
          </View>
          <View style={styles.attendees}>
            {attendees.map((profile) => (
              <PressableScale
                key={profile.id}
                onPress={() =>
                  profile.id === userId
                    ? router.push('/(tabs)/profile')
                    : router.push({ pathname: '/person/[id]', params: { id: profile.id } })
                }
                style={styles.attendee}
              >
                <Avatar profile={profile} size={42} />
                <Text style={styles.attendeeName}>
                  {profile.id === userId ? 'You' : profile.name}
                </Text>
                {profile.id === activity.hostId ? <Pill label="Host" tone="success" /> : null}
              </PressableScale>
            ))}
          </View>
        </View>

        {isHost ? (
          <Button
            icon="send"
            label="Invite more people"
            onPress={() =>
              router.push({ pathname: '/invite/[activityId]', params: { activityId: activity.id } })
            }
          />
        ) : !isAttending && !invitation && activity.visibility === 'community' && !isFull ? (
          <Button label="Join this activity" onPress={() => void join()} />
        ) : !isAttending && !invitation ? (
          <View style={styles.unavailable}>
            <Text style={styles.unavailableText}>
              {isFull ? 'This activity is full.' : 'This plan is invite-only.'}
            </Text>
          </View>
        ) : null}

        <View style={styles.safety}>
          <AppIcon name="shield" color={palette.forest} size={23} />
          <View style={styles.safetyCopy}>
            <Text style={styles.safetyTitle}>A comfortable first meeting</Text>
            <Text style={styles.safetyBody}>
              Meet in public, keep your own transport options, and leave whenever you want.
            </Text>
          </View>
        </View>
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge },
  content: { paddingHorizontal: spacing.lg, gap: spacing.xxl },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  hero: {
    minHeight: 310,
    justifyContent: 'space-between',
    borderRadius: radius.xl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadow.card,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between' },
  date: { ...typography.label, color: palette.primaryDark, textTransform: 'uppercase' },
  title: { ...typography.display, color: palette.ink, marginTop: spacing.md },
  vibeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  dot: { width: 9, height: 9, borderRadius: 5 },
  vibe: { ...typography.small, color: palette.inkMuted },
  invitationBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F0D8CF',
    backgroundColor: '#FEF3EF',
    padding: spacing.lg,
    gap: spacing.md,
  },
  inviteHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inviteTitle: { ...typography.h3, color: palette.ink },
  inviteMessage: { ...typography.body, color: palette.inkMuted, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionHalf: { flex: 1 },
  goingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: palette.forest,
    padding: spacing.md,
  },
  goingText: { ...typography.bodyStrong, color: palette.white },
  section: { gap: spacing.lg },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...typography.h2, color: palette.ink },
  spots: { ...typography.label, color: palette.inkMuted },
  description: { ...typography.body, color: palette.inkMuted },
  detailRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  detailIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.forestSoft,
  },
  detailCopy: { flex: 1, gap: 2 },
  detailLabel: { ...typography.micro, color: palette.inkMuted, textTransform: 'uppercase' },
  detailValue: { ...typography.bodyStrong, color: palette.ink },
  detailHint: { ...typography.small, color: palette.inkMuted },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.lg,
  },
  hostCopy: { flex: 1, gap: 2 },
  hostName: { ...typography.h3, color: palette.ink },
  hostHeadline: { ...typography.small, color: palette.inkMuted },
  reliability: { ...typography.micro, color: palette.forest, marginTop: 3 },
  attendees: { gap: spacing.sm },
  attendee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  attendeeName: { ...typography.bodyStrong, color: palette.ink, flex: 1 },
  unavailable: {
    borderRadius: radius.md,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.lg,
  },
  unavailableText: { ...typography.body, color: palette.inkMuted, textAlign: 'center' },
  safety: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.forestSoft,
    padding: spacing.lg,
  },
  safetyCopy: { flex: 1, gap: 3 },
  safetyTitle: { ...typography.bodyStrong, color: palette.forest },
  safetyBody: { ...typography.small, color: palette.forest },
  notFound: {
    ...typography.body,
    color: palette.inkMuted,
    textAlign: 'center',
    margin: spacing.xxxl,
  },
});
