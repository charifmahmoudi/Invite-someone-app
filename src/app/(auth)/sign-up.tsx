import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceChip } from '@/components/ui/chip';
import { InputField } from '@/components/ui/input-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ScrollScreen } from '@/components/ui/screen';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { warmMongoApi } from '@/data/mongodb-api';
import {
  firstValidationMessage,
  signUpCredentialsSchema,
  signUpIntroductionSchema,
  signUpSchema,
} from '@/domain/validation';
import { useApp } from '@/state/app-context';
import {
  ACTIVITY_CATEGORIES,
  AVAILABILITY_OPTIONS,
  CONNECTION_GOALS,
  type ActivityCategory,
} from '@/types/domain';

const toggleValue = <T extends string>(items: T[], item: T) =>
  items.includes(item) ? items.filter((value) => value !== item) : [...items, item];

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, state, isProductionBackend } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<ActivityCategory[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [connectionGoals, setConnectionGoals] = useState<string[]>([]);
  const [formError, setFormError] = useState<string>();

  const progress = useMemo(() => `${Math.round((step / 3) * 100)}%` as `${number}%`, [step]);

  useEffect(() => {
    if (isProductionBackend) void warmMongoApi();
  }, [isProductionBackend]);

  const continueToIntroduction = () => {
    const result = signUpCredentialsSchema.safeParse({
      name,
      email: email.trim(),
      password,
      confirmPassword,
      city,
    });
    if (!result.success) {
      setFormError(firstValidationMessage(result.error));
      return;
    }
    setFormError(undefined);
    setStep(2);
  };

  const continueToPreferences = () => {
    const result = signUpIntroductionSchema.safeParse({ headline, bio });
    if (!result.success) {
      setFormError(firstValidationMessage(result.error));
      return;
    }
    setFormError(undefined);
    setStep(3);
  };

  const submit = async () => {
    const result = signUpSchema.safeParse({
      name,
      email: email.trim(),
      password,
      city,
      headline,
      bio,
      interests,
      availability,
      connectionGoals,
    });
    if (!result.success) {
      setFormError(firstValidationMessage(result.error));
      return;
    }
    setFormError(undefined);
    try {
      const response = await signUp(result.data);
      if (response.requiresEmailConfirmation) {
        Alert.alert('Check your inbox', 'Confirm your email, then return here to sign in.', [
          { text: 'Go to sign in', onPress: () => router.replace('/(auth)/sign-in') },
        ]);
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create your profile.');
    }
  };

  return (
    <ScrollScreen keyboardAware contentContainerStyle={styles.scroll}>
      <ScreenHeader
        eyebrow={`Step ${step} of 3`}
        onBack={() => (step > 1 ? setStep((step - 1) as 1 | 2) : router.back())}
      />
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progress }]} />
      </View>

      <View style={styles.content}>
        {step === 1 ? (
          <>
            <View style={styles.heading}>
              <Text style={styles.title}>Let’s make your introduction easy.</Text>
              <Text style={styles.subtitle}>
                A thoughtful profile helps people feel comfortable saying yes.
              </Text>
            </View>
            <View style={styles.form}>
              <InputField
                autoComplete="name"
                label="Name"
                onChangeText={setName}
                placeholder="How people should know you"
                value={name}
              />
              <InputField
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label="Email"
                onChangeText={setEmail}
                placeholder="you@example.com"
                value={email}
              />
              <InputField
                autoCapitalize="none"
                autoComplete="new-password"
                hint="At least 8 characters"
                label="Password"
                onChangeText={setPassword}
                placeholder="Create a password"
                secureTextEntry
                value={password}
              />
              <InputField
                autoCapitalize="none"
                autoComplete="new-password"
                label="Confirm password"
                onChangeText={setConfirmPassword}
                onSubmitEditing={continueToIntroduction}
                placeholder="Enter it again"
                returnKeyType="next"
                secureTextEntry
                value={confirmPassword}
              />
              <InputField
                autoComplete="off"
                label="City"
                onChangeText={setCity}
                placeholder="Where do you want to meet people?"
                value={city}
              />
            </View>
            <View style={styles.note}>
              <Text style={styles.noteText}>
                Your account is stored securely. Other members see only your public introduction and
                a broad approximate area—never your email or exact location.
              </Text>
            </View>
            {formError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {formError}
              </Text>
            ) : null}
            <Button label="Continue" onPress={continueToIntroduction} />
          </>
        ) : step === 2 ? (
          <>
            <View style={styles.heading}>
              <Text style={styles.title}>Give people an easy way to know you.</Text>
              <Text style={styles.subtitle}>
                A short, genuine introduction makes the first invitation feel more comfortable.
              </Text>
            </View>
            <View style={styles.form}>
              <InputField
                hint="A simple signal, such as “Weekend walker and coffee explorer”"
                label="Headline"
                maxLength={80}
                onChangeText={setHeadline}
                placeholder="What should people know first?"
                value={headline}
              />
              <InputField
                hint={`${bio.length}/320 · Share the kinds of plans and conversations you enjoy`}
                label="About me"
                maxLength={320}
                multiline
                onChangeText={setBio}
                placeholder="A few genuine sentences about you"
                value={bio}
              />
            </View>
            {formError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {formError}
              </Text>
            ) : null}
            <Button label="Continue to preferences" onPress={continueToPreferences} />
          </>
        ) : (
          <>
            <View style={styles.heading}>
              <Text style={styles.title}>What would make a good invitation?</Text>
              <Text style={styles.subtitle}>
                Choose a few signals. You can change them any time.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>I’m interested in</Text>
              <Text style={styles.sectionHint}>Choose at least two</Text>
              <View style={styles.chips}>
                {ACTIVITY_CATEGORIES.map((category) => (
                  <ChoiceChip
                    key={category}
                    label={category}
                    onPress={() => setInterests((current) => toggleValue(current, category))}
                    selected={interests.includes(category)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>I’m usually free</Text>
              <View style={styles.chips}>
                {AVAILABILITY_OPTIONS.map((option) => (
                  <ChoiceChip
                    key={option}
                    label={option}
                    onPress={() => setAvailability((current) => toggleValue(current, option))}
                    selected={availability.includes(option)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>I’m looking for</Text>
              <View style={styles.chips}>
                {CONNECTION_GOALS.map((goal) => (
                  <ChoiceChip
                    key={goal}
                    label={goal}
                    onPress={() => setConnectionGoals((current) => toggleValue(current, goal))}
                    selected={connectionGoals.includes(goal)}
                  />
                ))}
              </View>
            </View>

            {formError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {formError}
              </Text>
            ) : null}
            <Button label="Create my profile" loading={state.busy} onPress={() => void submit()} />
            {state.busy && isProductionBackend ? (
              <Text accessibilityLiveRegion="polite" style={styles.busyHint}>
                Creating your account securely. Please keep this screen open while the service
                finishes.
              </Text>
            ) : null}
            {formError?.toLocaleLowerCase().includes('already exists') ? (
              <Button
                label="Sign in to this account"
                onPress={() => router.replace('/(auth)/sign-in')}
                variant="outline"
              />
            ) : null}
          </>
        )}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge },
  progressTrack: {
    height: 4,
    marginHorizontal: spacing.xxl,
    backgroundColor: palette.border,
    borderRadius: 2,
  },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: palette.primary },
  content: { padding: spacing.xxl, gap: spacing.xxl },
  heading: { gap: spacing.md },
  title: { ...typography.h1, color: palette.ink },
  subtitle: { ...typography.body, color: palette.inkMuted },
  form: { gap: spacing.lg },
  section: { gap: spacing.md },
  sectionTitle: { ...typography.h3, color: palette.ink },
  sectionHint: { ...typography.small, color: palette.inkMuted, marginTop: -spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { ...typography.small, color: palette.error },
  busyHint: { ...typography.small, color: palette.inkMuted, textAlign: 'center' },
  note: { borderRadius: radius.md, backgroundColor: palette.forestSoft, padding: spacing.lg },
  noteText: { ...typography.small, color: palette.forest },
});
