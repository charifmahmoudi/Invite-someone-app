import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ScrollScreen } from '@/components/ui/screen';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { useApp } from '@/state/app-context';
import type { Profile } from '@/types/domain';

export default function BlockedPeopleScreen() {
  const router = useRouter();
  const { loadBlockedProfiles, state, unblockProfile } = useApp();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setProfiles(await loadBlockedProfiles());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loadBlockedProfiles]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!state.hydrated) return null;
  if (!state.session) return <Redirect href="/(auth)/welcome" />;

  const unblock = (profile: Profile) => {
    Alert.alert(
      `Unblock ${profile.name.split(' ')[0]}?`,
      'You may appear in each other’s discovery again and future invitations will be possible. Old cancelled invitations are not restored.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => {
            void unblockProfile(profile)
              .then(() => setProfiles((current) => current.filter((item) => item.id !== profile.id)))
              .catch((caught: unknown) =>
                Alert.alert(
                  'Unable to unblock profile',
                  caught instanceof Error ? caught.message : 'Please try again.',
                ),
              );
          },
        },
      ],
    );
  };

  return (
    <ScrollScreen contentContainerStyle={styles.scroll}>
      <ScreenHeader eyebrow="PRIVACY" onBack={() => router.back()} title="Blocked people" />
      <View style={styles.content} testID="blocked-people-screen">
        <Text style={styles.intro}>
          Blocking is private. Invite does not tell someone that you blocked them.
        </Text>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={palette.primary} />
            <Text style={styles.loadingText}>Loading blocked people…</Text>
          </View>
        ) : error ? (
          <View style={styles.errorWrap}>
            <FeedbackBanner message={error} title="Unable to load blocked people" tone="error" />
            <Button label="Try again" onPress={() => void load()} variant="outline" />
          </View>
        ) : profiles.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No blocked people</Text>
            <Text style={styles.emptyBody}>
              When you block someone from their profile, you can manage that choice here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {profiles.map((profile) => (
              <View key={profile.id} style={styles.row}>
                <Avatar profile={profile} size={52} />
                <View style={styles.copy}>
                  <Text style={styles.name}>{profile.name}</Text>
                  <Text style={styles.meta}>@{profile.handle} · {profile.city}</Text>
                </View>
                <Button
                  fullWidth={false}
                  label="Unblock"
                  onPress={() => unblock(profile)}
                  testID={`unblock-${profile.id}`}
                  variant="outline"
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge },
  content: { paddingHorizontal: spacing.lg, gap: spacing.xl },
  intro: { ...typography.body, color: palette.inkMuted },
  loading: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  loadingText: { ...typography.small, color: palette.inkMuted },
  errorWrap: { gap: spacing.md },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.xxl,
  },
  emptyTitle: { ...typography.h3, color: palette.ink },
  emptyBody: { ...typography.small, color: palette.inkMuted, textAlign: 'center' },
  list: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.md,
  },
  copy: { flex: 1, gap: 2 },
  name: { ...typography.bodyStrong, color: palette.ink },
  meta: { ...typography.small, color: palette.inkMuted },
});
