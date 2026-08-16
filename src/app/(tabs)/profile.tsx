import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActivityCard } from '@/components/activity-card';
import { AppIcon } from '@/components/ui/app-icon';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { palette, radius, shadow, spacing, typography } from '@/constants/theme';
import { useApp, useCurrentProfile } from '@/state/app-context';

export default function ProfileScreen() {
  const router = useRouter();
  const { state, signOut, toggleSavedActivity } = useApp();
  const profile = useCurrentProfile();
  const hosted = state.activities.filter((activity) => activity.hostId === profile?.id);

  const logout = () => {
    Alert.alert('Sign out?', 'Your locally saved demo data will remain on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOut().then(() => router.replace('/(auth)/welcome'));
        },
      },
    ]);
  };

  if (!profile) return null;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.profileHero}>
          <View style={styles.heroTop}>
            <Avatar profile={profile} size={88} />
            <Button
              fullWidth={false}
              icon="edit"
              label="Edit profile"
              onPress={() => router.push('/profile/edit')}
              variant="outline"
            />
          </View>
          <View style={styles.identity}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.name}</Text>
              {profile.isVerified ? (
                <AppIcon name="shield" color={palette.forest} size={22} />
              ) : null}
            </View>
            <Text style={styles.handle}>
              @{profile.handle} · {profile.city}
            </Text>
            <Text style={styles.headline}>{profile.headline}</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>
          {state.session?.mode !== 'supabase' ? (
            <View style={styles.modeBadge}>
              <AppIcon name="info" color={palette.forest} size={16} />
              <Text style={styles.modeText}>
                {state.session?.mode === 'demo' ? 'Demo profile' : 'Local preview profile'}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.completedActivities}</Text>
            <Text style={styles.statLabel}>plans joined</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.reliabilityScore}%</Text>
            <Text style={styles.statLabel}>reliable</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{hosted.length}</Text>
            <Text style={styles.statLabel}>plans hosted</Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Good invitations for me" />
          <View style={styles.pills}>
            {profile.interests.map((item) => (
              <Pill key={item} label={item} tone="success" />
            ))}
          </View>
        </View>

        <View style={styles.sectionGrid}>
          <View style={styles.infoCard}>
            <AppIcon name="clock" color={palette.primaryDark} size={23} />
            <Text style={styles.infoTitle}>Usually free</Text>
            <Text style={styles.infoBody}>{profile.availability.join(' · ')}</Text>
          </View>
          <View style={styles.infoCard}>
            <AppIcon name="heart" color={palette.primaryDark} size={23} />
            <Text style={styles.infoTitle}>Looking for</Text>
            <Text style={styles.infoBody}>{profile.connectionGoals.join(' · ')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader
            actionLabel="Create another"
            onAction={() => router.push('/create')}
            title="Plans I host"
          />
          {hosted.length > 0 ? (
            <View style={styles.cards}>
              {hosted.map((activity) => (
                <ActivityCard
                  activity={activity}
                  attendees={activity.attendeeIds
                    .map((id) => state.profiles.find((candidate) => candidate.id === id))
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
          ) : (
            <View style={styles.noPlans}>
              <Text style={styles.noPlansText}>
                You have not hosted a plan yet. Small and specific works best.
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

        <Button icon="logout" label="Sign out" onPress={logout} variant="danger" />
        <Text style={styles.version}>Invite · MVP 1.0</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge, gap: spacing.xxl },
  profileHero: { gap: spacing.lg, paddingTop: spacing.lg },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  identity: { gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.h1, color: palette.ink },
  handle: { ...typography.small, color: palette.inkMuted },
  headline: { ...typography.h3, color: palette.ink, marginTop: spacing.sm },
  bio: { ...typography.body, color: palette.inkMuted },
  modeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.forestSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modeText: { ...typography.label, color: palette.forest },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingVertical: spacing.lg,
    ...shadow.card,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { ...typography.h2, color: palette.ink },
  statLabel: { ...typography.micro, color: palette.inkMuted, textAlign: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: palette.border },
  section: { gap: spacing.lg },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sectionGrid: { flexDirection: 'row', gap: spacing.md },
  infoCard: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: '#FEF3EF',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  infoTitle: { ...typography.label, color: palette.ink },
  infoBody: { ...typography.small, color: palette.inkMuted },
  cards: { gap: spacing.lg },
  noPlans: {
    alignItems: 'center',
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  noPlansText: { ...typography.body, color: palette.inkMuted, textAlign: 'center' },
  version: { ...typography.small, color: palette.inkMuted, textAlign: 'center' },
});
