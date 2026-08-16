import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ScrollScreen } from '@/components/ui/screen';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { firstValidationMessage, signInSchema } from '@/domain/validation';
import { useApp } from '@/state/app-context';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, state, isProductionBackend } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string>();

  const submit = async () => {
    const result = signInSchema.safeParse({ email: email.trim(), password });
    if (!result.success) {
      setFormError(firstValidationMessage(result.error));
      return;
    }
    setFormError(undefined);
    try {
      await signIn(result.data);
      router.replace('/(tabs)');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to sign in.');
    }
  };

  const useDemoCredentials = () => {
    setEmail('demo@invite.app');
    setPassword('invite-demo');
    Alert.alert('Demo account ready', 'Tap Sign in to continue.');
  };

  return (
    <ScrollScreen keyboardAware contentContainerStyle={styles.scroll}>
      <ScreenHeader onBack={() => router.back()} />
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>WELCOME BACK</Text>
          <Text style={styles.title}>Your next good plan is waiting.</Text>
          <Text style={styles.subtitle}>
            Sign in to see invitations, people, and activities picked for you.
          </Text>
        </View>

        {!isProductionBackend ? (
          <View style={styles.demoCard}>
            <Text style={styles.demoTitle}>Reviewing the app?</Text>
            <Text style={styles.demoBody}>
              Use demo@invite.app with any password, or open the full demo from the welcome screen.
            </Text>
            <Button
              fullWidth={false}
              label="Fill demo details"
              onPress={useDemoCredentials}
              variant="ghost"
            />
          </View>
        ) : null}

        <View style={styles.form}>
          <InputField
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="you@example.com"
            returnKeyType="next"
            value={email}
          />
          <InputField
            autoCapitalize="none"
            autoComplete="password"
            label="Password"
            onChangeText={setPassword}
            onSubmitEditing={() => void submit()}
            placeholder="Your password"
            returnKeyType="done"
            secureTextEntry
            value={password}
          />
          {formError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {formError}
            </Text>
          ) : null}
          <Button label="Sign in" loading={state.busy} onPress={() => void submit()} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New here?</Text>
          <Button
            fullWidth={false}
            label="Create a profile"
            onPress={() => router.replace('/(auth)/sign-up')}
            variant="ghost"
          />
        </View>
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge },
  content: { padding: spacing.xxl, gap: spacing.xxxl },
  heading: { gap: spacing.md },
  eyebrow: { ...typography.micro, color: palette.primaryDark },
  title: { ...typography.h1, color: palette.ink },
  subtitle: { ...typography.body, color: palette.inkMuted },
  demoCard: {
    borderRadius: radius.lg,
    backgroundColor: palette.forestSoft,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  demoTitle: { ...typography.bodyStrong, color: palette.forest },
  demoBody: { ...typography.small, color: palette.inkMuted },
  form: { gap: spacing.lg },
  error: { ...typography.small, color: palette.error },
  footer: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  footerText: { ...typography.body, color: palette.inkMuted },
});
