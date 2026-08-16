import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ProfileCard } from '@/components/profile-card';
import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ScrollScreen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { recommendProfiles } from '@/domain/matching';
import { useApp } from '@/state/app-context';

export default function InvitePeopleScreen() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const router = useRouter();
  const { state, sendInvitations } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState('This made me think of you — would you like to join?');
  const activity = state.activities.find((candidate) => candidate.id === activityId);
  const host = state.profiles.find((profile) => profile.id === activity?.hostId);

  const recommendations = useMemo(() => {
    if (!activity || !host) return [];
    const normalized = query.trim().toLowerCase();
    return recommendProfiles(state.profiles, activity, host).filter(
      (result) =>
        !normalized ||
        result.profile.name.toLowerCase().includes(normalized) ||
        result.profile.city.toLowerCase().includes(normalized) ||
        result.profile.interests.some((item) => item.toLowerCase().includes(normalized)),
    );
  }, [activity, host, query, state.profiles]);

  if (!state.hydrated) return null;
  if (!state.session) return <Redirect href="/(auth)/welcome" />;

  const toggle = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  const finish = () => {
    if (activity) router.replace({ pathname: '/activity/[id]', params: { id: activity.id } });
  };

  const submit = async () => {
    if (!activity || selectedIds.length === 0) return;
    try {
      const sent = await sendInvitations({
        activityId: activity.id,
        receiverIds: selectedIds,
        message,
      });
      Alert.alert(
        'Invitations sent',
        `${sent.length} thoughtful invitation${sent.length === 1 ? '' : 's'} on the way.`,
        [{ text: 'View activity', onPress: finish }],
      );
    } catch (error) {
      Alert.alert(
        'Unable to send invitations',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  if (!activity || !host) {
    return (
      <ScrollScreen>
        <ScreenHeader onBack={() => router.back()} title="Invite people" />
        <Text style={styles.notFound}>This activity could not be found.</Text>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen keyboardAware contentContainerStyle={styles.scroll}>
      <ScreenHeader eyebrow="ONE LAST STEP" onBack={() => router.back()} title="Invite people" />
      <View style={styles.content}>
        <View style={styles.activitySummary}>
          <View style={styles.summaryIcon}>
            <AppIcon name="send" color={palette.primaryDark} size={24} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryLabel}>INVITING TO</Text>
            <Text style={styles.summaryTitle}>{activity.title}</Text>
          </View>
          <Text style={styles.selectionCount}>{selectedIds.length} selected</Text>
        </View>

        <View style={styles.heading}>
          <Text style={styles.title}>Who might enjoy this?</Text>
          <Text style={styles.subtitle}>
            Suggestions use shared interests and location—not sensitive personal traits.
          </Text>
        </View>

        <SearchField
          onChangeText={setQuery}
          placeholder="Search people or interests"
          value={query}
        />
        <View style={styles.people}>
          {recommendations.map((result) => {
            const selected = selectedIds.includes(result.profile.id);
            return (
              <ProfileCard
                key={result.profile.id}
                onPress={() => toggle(result.profile.id)}
                profile={result.profile}
                reasons={result.reasons.slice(0, 2)}
                selected={selected}
                trailing={
                  <View style={[styles.check, selected && styles.checkSelected]}>
                    {selected ? <AppIcon name="check" color={palette.white} size={17} /> : null}
                  </View>
                }
              />
            );
          })}
        </View>

        <InputField
          label="Add a personal note"
          maxLength={180}
          multiline
          onChangeText={setMessage}
          value={message}
        />
        <View style={styles.actions}>
          <Button
            disabled={selectedIds.length === 0}
            icon="send"
            label={`Send ${selectedIds.length || ''} invitation${selectedIds.length === 1 ? '' : 's'}`.replace(
              '  ',
              ' ',
            )}
            loading={state.busy}
            onPress={() => void submit()}
          />
          <Button label="Skip for now" onPress={finish} variant="ghost" />
        </View>
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge },
  content: { padding: spacing.xxl, gap: spacing.xxl },
  activitySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FEF3EF',
    padding: spacing.lg,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F9DDD4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: { flex: 1, gap: 2 },
  summaryLabel: { ...typography.micro, color: palette.primaryDark },
  summaryTitle: { ...typography.bodyStrong, color: palette.ink },
  selectionCount: { ...typography.label, color: palette.forest },
  heading: { gap: spacing.sm },
  title: { ...typography.h1, color: palette.ink },
  subtitle: { ...typography.body, color: palette.inkMuted },
  people: { gap: spacing.md },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: { borderColor: palette.forest, backgroundColor: palette.forest },
  actions: { gap: spacing.sm },
  notFound: {
    ...typography.body,
    color: palette.inkMuted,
    textAlign: 'center',
    margin: spacing.xxxl,
  },
});
