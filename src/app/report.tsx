import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceChip } from '@/components/ui/chip';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { InputField } from '@/components/ui/input-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ScrollScreen } from '@/components/ui/screen';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { useApp } from '@/state/app-context';
import {
  REPORT_REASONS,
  type ReportReason,
  type ReportTargetType,
  type SafetyReportReceipt,
} from '@/types/domain';

export default function ReportScreen() {
  const params = useLocalSearchParams<{
    targetType?: string;
    targetId?: string;
    targetName?: string;
  }>();
  const router = useRouter();
  const { blockProfile, reportSafetyConcern, state } = useApp();
  const targetType: ReportTargetType | undefined =
    params.targetType === 'profile' || params.targetType === 'activity'
      ? params.targetType
      : undefined;
  const targetId = params.targetId;
  const targetName = params.targetName ?? (targetType === 'profile' ? 'this profile' : 'this plan');
  const [reason, setReason] = useState<ReportReason>();
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string>();
  const [receipt, setReceipt] = useState<SafetyReportReceipt>();

  if (!state.hydrated) return null;
  if (!state.session) return <Redirect href="/(auth)/welcome" />;

  if (!targetType || !targetId) {
    return (
      <ScrollScreen>
        <ScreenHeader onBack={() => router.back()} title="Report" />
        <FeedbackBanner
          message="The report target is missing. Return to the previous screen and try again."
          title="Unable to start report"
          tone="error"
        />
      </ScrollScreen>
    );
  }

  const submit = async () => {
    if (!reason) {
      setError('Choose the reason that best describes the concern.');
      return;
    }
    setError(undefined);
    try {
      const result = await reportSafetyConcern({
        targetType,
        targetId,
        reason,
        ...(details.trim() ? { details: details.trim() } : {}),
      });
      setReceipt(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    }
  };

  const blockReportedProfile = () => {
    if (targetType !== 'profile') return;
    Alert.alert(
      `Block ${targetName}?`,
      'Blocking is private. You will stop appearing in each other’s discovery and new invitations will be prevented.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            void blockProfile(targetId)
              .then(() => router.replace('/(tabs)/people'))
              .catch((caught: unknown) =>
                Alert.alert(
                  'Unable to block profile',
                  caught instanceof Error ? caught.message : 'Please try again.',
                ),
              );
          },
        },
      ],
    );
  };

  if (receipt) {
    return (
      <ScrollScreen contentContainerStyle={styles.scroll}>
        <ScreenHeader onBack={() => router.back()} title="Report sent" />
        <View style={styles.content} testID="report-success">
          <FeedbackBanner
            message="Invite support can review this report without exposing your password or authentication data. If you are in immediate danger, contact local emergency services rather than waiting for an in-app response."
            title="Thanks for telling us"
            tone="success"
          />
          <View style={styles.receiptCard}>
            <Text style={styles.receiptLabel}>Report reference</Text>
            <Text selectable style={styles.receiptValue}>
              {receipt.id}
            </Text>
          </View>
          {targetType === 'profile' ? (
            <Button label={`Block ${targetName}`} onPress={blockReportedProfile} variant="danger" />
          ) : null}
          <Button label="Done" onPress={() => router.back()} variant="outline" />
        </View>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen keyboardAware contentContainerStyle={styles.scroll}>
      <ScreenHeader eyebrow="SAFETY" onBack={() => router.back()} title="Send a report" />
      <View style={styles.content} testID="report-screen">
        <View style={styles.intro}>
          <Text style={styles.title}>Tell us what happened.</Text>
          <Text style={styles.subtitle}>
            You are reporting {targetName}. Choose the closest reason and add only the detail needed
            to understand the concern.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason</Text>
          <View style={styles.reasons}>
            {REPORT_REASONS.map((item) => (
              <ChoiceChip
                key={item}
                label={item}
                onPress={() => setReason(item)}
                selected={reason === item}
              />
            ))}
          </View>
        </View>

        <InputField
          label="What should we know? (optional)"
          maxLength={1000}
          multiline
          onChangeText={setDetails}
          placeholder="Describe the behavior, where it happened, and any immediate safety concern."
          value={details}
        />

        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>Do not include secrets</Text>
          <Text style={styles.privacyBody}>
            Never send your password, email verification link, Firebase token, payment credentials,
            or another person’s private address in a report.
          </Text>
        </View>

        {error ? <FeedbackBanner message={error} title="Check this report" tone="error" /> : null}
        <Button
          label="Send report"
          loading={state.busy}
          onPress={() => void submit()}
          testID="submit-report"
        />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge },
  content: { paddingHorizontal: spacing.lg, gap: spacing.xxl },
  intro: { gap: spacing.sm },
  title: { ...typography.h1, color: palette.ink },
  subtitle: { ...typography.body, color: palette.inkMuted },
  section: { gap: spacing.md },
  sectionTitle: { ...typography.h2, color: palette.ink },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  privacyCard: {
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.lg,
  },
  privacyTitle: { ...typography.bodyStrong, color: palette.ink },
  privacyBody: { ...typography.small, color: palette.inkMuted },
  receiptCard: {
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.lg,
  },
  receiptLabel: { ...typography.micro, color: palette.inkMuted, textTransform: 'uppercase' },
  receiptValue: { ...typography.small, color: palette.ink },
});
