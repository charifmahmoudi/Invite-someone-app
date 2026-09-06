import { FirebaseError } from 'firebase/app';
import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { isFirebaseAuthConfigured } from '@/auth/firebase-provider';
import { getGoogleIdToken, isGoogleSignInAvailable } from '@/auth/google-sign-in';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ScrollScreen } from '@/components/ui/screen';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { firebaseAuth } from '@/data/firebase';
import { firstValidationMessage, signInSchema } from '@/domain/validation';
import { useApp } from '@/state/app-context';

const firebaseErrorMessage = (error: unknown, fallback: string) => {
  if (!(error instanceof FirebaseError)) return error instanceof Error ? error.message : fallback;
  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'That email and password do not match an account.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again a little later.';
    case 'auth/network-request-failed':
      return 'Could not reach Firebase. Check your connection and try again.';
    default:
      return fallback;
  }
};

function GoogleSignInButton({
  onError,
  onSuccess,
}: {
  onError: (message: string | undefined) => void;
  onSuccess: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const auth = firebaseAuth;
    if (!auth) {
      onError('Firebase Auth is not configured.');
      return;
    }

    onError(undefined);
    setBusy(true);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) return;
      await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
      onSuccess();
    } catch (error) {
      onError(firebaseErrorMessage(error, 'Unable to continue with Google.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      label="Continue with Google"
      loading={busy}
      onPress={() => void submit()}
      testID="auth-google"
      variant="outline"
    />
  );
}

function FirebaseSignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [formError, setFormError] = useState<string>();

  const submit = async () => {
    const result = signInSchema.safeParse({ email: email.trim(), password });
    if (!result.success) {
      setFormError(firstValidationMessage(result.error));
      return;
    }
    const auth = firebaseAuth;
    if (!auth) {
      setFormError('Firebase Auth is not configured.');
      return;
    }

    setFormError(undefined);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, result.data.email, result.data.password);
      router.replace('/');
    } catch (error) {
      setFormError(firebaseErrorMessage(error, 'Unable to sign in.'));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setFormError('Enter your email first, then choose Forgot password.');
      return;
    }
    const auth = firebaseAuth;
    if (!auth) return;

    setFormError(undefined);
    setResetBusy(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      Alert.alert(
        'Check your inbox',
        'If an account uses that email, Firebase will send password-reset instructions.',
      );
    } catch (error) {
      setFormError(firebaseErrorMessage(error, 'Unable to send password-reset instructions.'));
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <ScrollScreen keyboardAware contentContainerStyle={styles.scroll}>
      <ScreenHeader onBack={() => router.back()} />
      <View style={styles.content} testID="auth-sign-in-screen">
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>WELCOME BACK</Text>
          <Text style={styles.title}>Your next good plan is waiting.</Text>
          <Text style={styles.subtitle}>
            Sign in with email and password{isGoogleSignInAvailable ? ', or continue with Google' : ''}.
          </Text>
        </View>

        <View style={styles.form}>
          <InputField
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="you@example.com"
            returnKeyType="next"
            testID="auth-email"
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
            testID="auth-password"
            value={password}
          />
          {formError ? (
            <Text accessibilityRole="alert" style={styles.error} testID="auth-error">
              {formError}
            </Text>
          ) : null}
          <Button label="Sign in" loading={busy} onPress={() => void submit()} testID="auth-submit" />
          <Button
            fullWidth={false}
            label="Forgot password?"
            loading={resetBusy}
            onPress={() => void resetPassword()}
            variant="ghost"
          />

          {isGoogleSignInAvailable ? (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.divider} />
              </View>
              <GoogleSignInButton
                onError={setFormError}
                onSuccess={() => router.replace('/')}
              />
            </>
          ) : null}
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

function LegacySignInScreen() {
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
      <View style={styles.content} testID="auth-sign-in-screen">
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
            testID="auth-email"
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
            testID="auth-password"
            value={password}
          />
          {formError ? (
            <Text accessibilityRole="alert" style={styles.error} testID="auth-error">
              {formError}
            </Text>
          ) : null}
          <Button label="Sign in" loading={state.busy} onPress={() => void submit()} testID="auth-submit" />
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

export default function SignInScreen() {
  return isFirebaseAuthConfigured ? <FirebaseSignInScreen /> : <LegacySignInScreen />;
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
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  divider: { flex: 1, height: 1, backgroundColor: palette.border },
  dividerText: { ...typography.small, color: palette.inkMuted },
});
