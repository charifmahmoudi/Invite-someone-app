import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChoiceChip } from '@/components/ui/chip';
import { InputField } from '@/components/ui/input-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ScrollScreen } from '@/components/ui/screen';
import { palette, spacing, typography } from '@/constants/theme';
import { firstValidationMessage, profileUpdateSchema } from '@/domain/validation';
import { useApp, useCurrentProfile } from '@/state/app-context';
import {
  ACTIVITY_CATEGORIES,
  AVAILABILITY_OPTIONS,
  CONNECTION_GOALS,
  type ActivityCategory,
} from '@/types/domain';

const toggleValue = <T extends string>(items: T[], item: T) =>
  items.includes(item) ? items.filter((value) => value !== item) : [...items, item];

export default function EditProfileScreen() {
  const router = useRouter();
  const profile = useCurrentProfile();
  const { updateProfile, state } = useApp();
  const [name, setName] = useState(profile?.name ?? '');
  const [headline, setHeadline] = useState(profile?.headline ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [interests, setInterests] = useState<ActivityCategory[]>(profile?.interests ?? []);
  const [availability, setAvailability] = useState<string[]>(profile?.availability ?? []);
  const [connectionGoals, setConnectionGoals] = useState<string[]>(profile?.connectionGoals ?? []);
  const [formError, setFormError] = useState<string>();

  if (!state.hydrated) return null;
  if (!state.session) return <Redirect href="/(auth)/welcome" />;

  const submit = async () => {
    const result = profileUpdateSchema.safeParse({
      name,
      headline,
      bio,
      city,
      interests,
      availability,
      connectionGoals,
    });
    if (!result.success) {
      setFormError(firstValidationMessage(result.error));
      return;
    }
    try {
      await updateProfile(result.data);
      router.back();
    } catch (error) {
      Alert.alert(
        'Unable to save profile',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  if (!profile) return null;

  return (
    <ScrollScreen keyboardAware contentContainerStyle={styles.scroll}>
      <ScreenHeader onBack={() => router.back()} title="Edit profile" />
      <View style={styles.content}>
        <View style={styles.avatarSection}>
          <Avatar
            profile={{
              ...profile,
              name,
              initials: name
                ? name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()
                : '?',
            }}
            size={92}
          />
          <Text style={styles.avatarHint}>A clear, genuine introduction builds trust.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About me</Text>
          <InputField label="Name" onChangeText={setName} value={name} />
          <InputField label="Headline" maxLength={80} onChangeText={setHeadline} value={headline} />
          <InputField label="Bio" maxLength={320} multiline onChangeText={setBio} value={bio} />
          <InputField label="City" onChangeText={setCity} value={city} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.chips}>
            {ACTIVITY_CATEGORIES.map((item) => (
              <ChoiceChip
                key={item}
                label={item}
                onPress={() => setInterests((current) => toggleValue(current, item))}
                selected={interests.includes(item)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usually free</Text>
          <View style={styles.chips}>
            {AVAILABILITY_OPTIONS.map((item) => (
              <ChoiceChip
                key={item}
                label={item}
                onPress={() => setAvailability((current) => toggleValue(current, item))}
                selected={availability.includes(item)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Looking for</Text>
          <View style={styles.chips}>
            {CONNECTION_GOALS.map((item) => (
              <ChoiceChip
                key={item}
                label={item}
                onPress={() => setConnectionGoals((current) => toggleValue(current, item))}
                selected={connectionGoals.includes(item)}
              />
            ))}
          </View>
        </View>

        {formError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {formError}
          </Text>
        ) : null}
        <Button label="Save profile" loading={state.busy} onPress={() => void submit()} />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge },
  content: { padding: spacing.xxl, gap: spacing.xxxl },
  avatarSection: { alignItems: 'center', gap: spacing.md },
  avatarHint: { ...typography.small, color: palette.inkMuted, textAlign: 'center' },
  section: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  sectionTitle: { ...typography.h2, color: palette.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { ...typography.small, color: palette.error },
});
