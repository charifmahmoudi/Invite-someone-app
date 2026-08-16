import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { palette, radius, shadow, spacing, typography } from '@/constants/theme';
import { useApp } from '@/state/app-context';
import type { Invitation } from '@/types/domain';
import { formatActivityDate, relativeTime } from '@/utils/format';

type Segment = 'received' | 'sent';

export default function InvitationsScreen() {
  const router = useRouter();
  const { state, respondToInvitation } = useApp();
  const [segment, setSegment] = useState<Segment>('received');

  const invitations = useMemo(
    () =>
      state.invitations
        .filter((invitation) =>
          segment === 'received'
            ? invitation.receiverId === state.session?.userId
            : invitation.senderId === state.session?.userId,
        )
        .sort((left, right) => {
          if (left.status === 'pending' && right.status !== 'pending') return -1;
          if (right.status === 'pending' && left.status !== 'pending') return 1;
          return right.createdAt.localeCompare(left.createdAt);
        }),
    [segment, state.invitations, state.session?.userId],
  );

  const respond = async (invitation: Invitation, status: 'accepted' | 'declined' | 'cancelled') => {
    try {
      await respondToInvitation(invitation.id, status);
    } catch (error) {
      Alert.alert(
        'Unable to update the invitation',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>MAKE IT EASY TO SAY YES</Text>
          <Text style={styles.title}>Invitations</Text>
          <Text style={styles.subtitle}>Every invite is optional. A kind no is always enough.</Text>
        </View>

        <View style={styles.segmented}>
          {(['received', 'sent'] as const).map((item) => (
            <PressableScale
              accessibilityState={{ selected: segment === item }}
              key={item}
              onPress={() => setSegment(item)}
              style={[styles.segment, segment === item && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, segment === item && styles.segmentTextActive]}>
                {item === 'received' ? 'Received' : 'Sent'}
              </Text>
            </PressableScale>
          ))}
        </View>

        <View style={styles.cards}>
          {invitations.map((invitation) => {
            const activity = state.activities.find((item) => item.id === invitation.activityId);
            const otherId = segment === 'received' ? invitation.senderId : invitation.receiverId;
            const person = state.profiles.find((profile) => profile.id === otherId);
            if (!activity || !person) return null;
            return (
              <View key={invitation.id} style={styles.card}>
                <PressableScale
                  onPress={() =>
                    router.push({ pathname: '/activity/[id]', params: { id: activity.id } })
                  }
                  style={styles.cardTop}
                >
                  <Avatar profile={person} size={50} />
                  <View style={styles.inviteCopy}>
                    <Text style={styles.personName}>
                      {segment === 'received' ? person.name : `To ${person.name}`}
                    </Text>
                    <Text numberOfLines={2} style={styles.activityTitle}>
                      {activity.title}
                    </Text>
                    <Text style={styles.date}>{formatActivityDate(activity.startAt)}</Text>
                  </View>
                  <View style={[styles.status, styles[`status_${invitation.status}`]]}>
                    <Text style={styles.statusText}>{invitation.status}</Text>
                  </View>
                </PressableScale>

                {invitation.message ? (
                  <View style={styles.message}>
                    <Text style={styles.quote}>“{invitation.message}”</Text>
                    <Text style={styles.time}>{relativeTime(invitation.createdAt)}</Text>
                  </View>
                ) : null}

                {invitation.status === 'pending' && segment === 'received' ? (
                  <View style={styles.actions}>
                    <View style={styles.actionButton}>
                      <Button
                        label="Not this time"
                        onPress={() => void respond(invitation, 'declined')}
                        variant="outline"
                      />
                    </View>
                    <View style={styles.actionButton}>
                      <Button label="I’m in" onPress={() => void respond(invitation, 'accepted')} />
                    </View>
                  </View>
                ) : null}

                {invitation.status === 'pending' && segment === 'sent' ? (
                  <Button
                    label="Cancel invitation"
                    onPress={() => void respond(invitation, 'cancelled')}
                    variant="ghost"
                  />
                ) : null}
              </View>
            );
          })}
        </View>

        {invitations.length === 0 ? (
          <EmptyState
            body={
              segment === 'received'
                ? 'When someone invites you, it will appear here.'
                : 'Create a plan and invite someone who might enjoy it.'
            }
            icon={segment === 'received' ? 'mail' : 'send'}
            title={segment === 'received' ? 'No invitations yet' : 'Nothing sent yet'}
            action={
              segment === 'sent' ? (
                <Button
                  fullWidth={false}
                  icon="plus"
                  label="Create a plan"
                  onPress={() => router.push('/create')}
                />
              ) : undefined
            }
          />
        ) : null}

        <View style={styles.safetyNote}>
          <AppIcon name="shield" color={palette.forest} size={22} />
          <Text style={styles.safetyText}>
            Meet in public for first-time plans, tell someone where you are going, and trust your
            instincts.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge, gap: spacing.xl },
  heading: { gap: spacing.sm, paddingTop: spacing.md },
  eyebrow: { ...typography.micro, color: palette.primaryDark },
  title: { ...typography.h1, color: palette.ink },
  subtitle: { ...typography.body, color: palette.inkMuted },
  segmented: {
    flexDirection: 'row',
    backgroundColor: palette.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.sm },
  segmentActive: { backgroundColor: palette.surface, ...shadow.card },
  segmentText: { ...typography.label, color: palette.inkMuted, textTransform: 'capitalize' },
  segmentTextActive: { color: palette.ink },
  cards: { gap: spacing.lg },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    overflow: 'hidden',
    ...shadow.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  inviteCopy: { flex: 1, gap: 2 },
  personName: { ...typography.small, color: palette.inkMuted },
  activityTitle: { ...typography.h3, color: palette.ink },
  date: { ...typography.small, color: palette.primaryDark },
  status: {
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  status_pending: { backgroundColor: '#FFF0D2' },
  status_accepted: { backgroundColor: palette.forestSoft },
  status_declined: { backgroundColor: '#F4E7E5' },
  status_cancelled: { backgroundColor: palette.surfaceMuted },
  statusText: { ...typography.micro, color: palette.inkMuted, textTransform: 'uppercase' },
  message: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: '#FBFBF8',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  quote: { ...typography.body, color: palette.ink, fontStyle: 'italic' },
  time: { ...typography.small, color: palette.inkMuted },
  actions: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, paddingTop: 0 },
  actionButton: { flex: 1 },
  safetyNote: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.forestSoft,
    padding: spacing.lg,
  },
  safetyText: { ...typography.small, color: palette.forest, flex: 1 },
});
