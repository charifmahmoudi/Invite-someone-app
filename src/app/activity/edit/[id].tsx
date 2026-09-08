import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { ChoiceChip } from '@/components/ui/chip';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { InputField } from '@/components/ui/input-field';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ScrollScreen } from '@/components/ui/screen';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { activityDraftSchema, firstValidationMessage } from '@/domain/validation';
import { useActivity, useApp } from '@/state/app-context';
import {
  ACTIVITY_CATEGORIES,
  type Activity,
  type ActivityCategory,
  type ActivityVibe,
  type ActivityVisibility,
} from '@/types/domain';
import { formatDay, formatTime } from '@/utils/format';

export default function EditActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const activity = useActivity(id);
  const { state } = useApp();

  if (!state.hydrated) return null;
  if (!state.session) return <Redirect href="/(auth)/welcome" />;
  if (!activity) {
    return (
      <ScrollScreen>
        <ScreenHeader onBack={() => router.back()} title="Edit plan" />
        <Text style={styles.notFound}>This plan could not be found.</Text>
      </ScrollScreen>
    );
  }
  if (activity.hostId !== state.session.userId) {
    return (
      <ScrollScreen>
        <ScreenHeader onBack={() => router.back()} title="Edit plan" />
        <FeedbackBanner
          message="Only the host can edit this plan."
          title="Editing is not available"
          tone="warning"
        />
      </ScrollScreen>
    );
  }
  if (activity.status === 'cancelled') {
    return (
      <ScrollScreen>
        <ScreenHeader onBack={() => router.back()} title="Edit plan" />
        <FeedbackBanner
          message="Cancelled plans remain visible for history but cannot be changed."
          title="This plan is cancelled"
          tone="warning"
        />
      </ScrollScreen>
    );
  }

  return <EditActivityForm key={activity.id} activity={activity} />;
}

function EditActivityForm({ activity }: { activity: Activity }) {
  const router = useRouter();
  const { state, updateActivity } = useApp();
  const [title, setTitle] = useState(activity.title);
  const [description, setDescription] = useState(activity.description);
  const [category, setCategory] = useState<ActivityCategory>(activity.category);
  const [startAt, setStartAt] = useState(() => new Date(activity.startAt));
  const [location, setLocation] = useState(activity.location);
  const [city, setCity] = useState(activity.city);
  const [capacity, setCapacity] = useState(activity.capacity);
  const [visibility, setVisibility] = useState<ActivityVisibility>(activity.visibility);
  const [vibe, setVibe] = useState<ActivityVibe>(activity.vibe);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [formError, setFormError] = useState<string>();
  const minimumCapacity = Math.max(2, activity.attendeeIds.length);

  const changeDate = (_event: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS !== 'ios') setPickerMode(null);
    if (!value) return;
    setStartAt((current) => {
      const next = new Date(current);
      if (pickerMode === 'date') {
        next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
      } else {
        next.setHours(value.getHours(), value.getMinutes(), 0, 0);
      }
      return next;
    });
  };

  const submit = async () => {
    const result = activityDraftSchema.safeParse({
      title,
      description,
      category,
      startAt: startAt.toISOString(),
      location,
      city,
      capacity,
      visibility,
      vibe,
    });
    if (!result.success) {
      setFormError(firstValidationMessage(result.error));
      return;
    }
    setFormError(undefined);
    try {
      await updateActivity(activity.id, result.data);
      router.replace({ pathname: '/activity/[id]', params: { id: activity.id } });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <ScrollScreen
      keyboardAware
      edges={['top', 'left', 'right']}
      contentContainerStyle={styles.scroll}
    >
      <ScreenHeader eyebrow="HOST CONTROLS" onBack={() => router.back()} title="Edit plan" />
      <View style={styles.content} testID="edit-plan-screen">
        <View style={styles.heading}>
          <Text style={styles.title}>Keep the plan accurate.</Text>
          <Text style={styles.subtitle}>
            People who are already going should be able to trust the time, place, and group size.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What are you planning?</Text>
          <InputField label="Title" maxLength={70} onChangeText={setTitle} value={title} />
          <InputField
            label="Description"
            maxLength={500}
            multiline
            onChangeText={setDescription}
            value={description}
          />
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.chips}>
            {ACTIVITY_CATEGORIES.map((item) => (
              <ChoiceChip
                key={item}
                label={item}
                onPress={() => setCategory(item)}
                selected={category === item}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>When and where?</Text>
          <View style={styles.dateRow}>
            <PressableScale onPress={() => setPickerMode('date')} style={styles.dateButton}>
              <AppIcon name="calendar" color={palette.forest} size={20} />
              <View>
                <Text style={styles.dateLabel}>Date</Text>
                <Text style={styles.dateValue}>{formatDay(startAt.toISOString())}</Text>
              </View>
            </PressableScale>
            <PressableScale onPress={() => setPickerMode('time')} style={styles.dateButton}>
              <AppIcon name="clock" color={palette.forest} size={20} />
              <View>
                <Text style={styles.dateLabel}>Time</Text>
                <Text style={styles.dateValue}>{formatTime(startAt.toISOString())}</Text>
              </View>
            </PressableScale>
          </View>
          {pickerMode ? (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                mode={pickerMode}
                onChange={changeDate}
                value={startAt}
              />
              {Platform.OS === 'ios' ? (
                <Button
                  fullWidth={false}
                  label="Done"
                  onPress={() => setPickerMode(null)}
                  variant="ghost"
                />
              ) : null}
            </View>
          ) : null}
          <InputField label="Meeting place" onChangeText={setLocation} value={location} />
          <InputField label="City" onChangeText={setCity} value={city} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group and privacy</Text>
          <Text style={styles.fieldLabel}>Group size</Text>
          <View style={styles.counter}>
            <PressableScale
              accessibilityLabel="Decrease capacity"
              disabled={capacity <= minimumCapacity}
              onPress={() => setCapacity((value) => Math.max(minimumCapacity, value - 1))}
              style={styles.counterButton}
            >
              <Text style={styles.counterSymbol}>−</Text>
            </PressableScale>
            <View style={styles.counterValue}>
              <Text style={styles.capacity}>{capacity}</Text>
              <Text style={styles.capacityLabel}>
                {activity.attendeeIds.length} already going
              </Text>
            </View>
            <PressableScale
              accessibilityLabel="Increase capacity"
              disabled={capacity >= 30}
              onPress={() => setCapacity((value) => Math.min(30, value + 1))}
              style={styles.counterButton}
            >
              <Text style={styles.counterSymbol}>+</Text>
            </PressableScale>
          </View>

          <Text style={styles.fieldLabel}>Vibe</Text>
          <View style={styles.chips}>
            {(['Easygoing', 'Active', 'Focused'] as const).map((item) => (
              <ChoiceChip
                key={item}
                label={item}
                onPress={() => setVibe(item)}
                selected={vibe === item}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Who can see it?</Text>
          <View style={styles.visibilityCards}>
            <PressableScale
              onPress={() => setVisibility('community')}
              style={[styles.visibility, visibility === 'community' && styles.visibilitySelected]}
            >
              <AppIcon name="globe" color={palette.forest} size={24} />
              <View style={styles.visibilityCopy}>
                <Text style={styles.visibilityTitle}>Community</Text>
                <Text style={styles.visibilityBody}>People nearby can discover and join.</Text>
              </View>
              {visibility === 'community' ? (
                <AppIcon name="check" color={palette.forest} size={20} />
              ) : null}
            </PressableScale>
            <PressableScale
              onPress={() => setVisibility('invite-only')}
              style={[styles.visibility, visibility === 'invite-only' && styles.visibilitySelected]}
            >
              <AppIcon name="lock" color={palette.forest} size={24} />
              <View style={styles.visibilityCopy}>
                <Text style={styles.visibilityTitle}>Invite-only</Text>
                <Text style={styles.visibilityBody}>Only people you invite can see it.</Text>
              </View>
              {visibility === 'invite-only' ? (
                <AppIcon name="check" color={palette.forest} size={20} />
              ) : null}
            </PressableScale>
          </View>
        </View>

        {formError ? <FeedbackBanner message={formError} title="Check this plan" tone="error" /> : null}
        <Button
          icon="check"
          label="Save changes"
          loading={state.busy}
          onPress={() => void submit()}
          testID="edit-plan-submit"
        />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge },
  content: { padding: spacing.xxl, gap: spacing.xxxl },
  heading: { gap: spacing.sm },
  title: { ...typography.h1, color: palette.ink },
  subtitle: { ...typography.body, color: palette.inkMuted },
  section: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  sectionTitle: { ...typography.h2, color: palette.ink },
  fieldLabel: { ...typography.label, color: palette.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dateRow: { flexDirection: 'row', gap: spacing.md },
  dateButton: {
    flex: 1,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.md,
  },
  dateLabel: { ...typography.micro, color: palette.inkMuted, textTransform: 'uppercase' },
  dateValue: { ...typography.bodyStrong, color: palette.ink },
  pickerWrap: {
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    padding: spacing.sm,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.md,
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  counterSymbol: { fontSize: 26, color: palette.ink },
  counterValue: { alignItems: 'center' },
  capacity: { ...typography.h2, color: palette.ink },
  capacityLabel: { ...typography.micro, color: palette.inkMuted },
  visibilityCards: { gap: spacing.md },
  visibility: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.lg,
  },
  visibilitySelected: { borderColor: palette.forest, backgroundColor: palette.forestSoft },
  visibilityCopy: { flex: 1, gap: 2 },
  visibilityTitle: { ...typography.bodyStrong, color: palette.ink },
  visibilityBody: { ...typography.small, color: palette.inkMuted },
  notFound: { ...typography.body, color: palette.inkMuted, textAlign: 'center', margin: spacing.xxxl },
});
