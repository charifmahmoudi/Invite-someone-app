import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { isSupabaseAuthConfigured } from '@/auth/supabase-provider';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ScrollScreen } from '@/components/ui/screen';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { supabase } from '@/data/supabase';
import { firstValidationMessage, signInSchema } from '@/domain/validation';
import { useApp } from '@/state/app-context';

WebBrowser.maybeCompleteAuthSession();

const authErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

const GOOGLE_REDIRECT_URL = 'invite://google-auth';

const sessionTokensFromUrl = (url: string) => {
  const parsed = new URL(url);
  const params = new URLSearchParams(
    parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.search.slice(1),
  );
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
  };
};

function SupabaseSignInScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);
  const [formError, setFormError] = useState<string>();

  const requireSupabase = () => {
    if (!supabase) throw new Error('Supabase Auth is not configured.');
    return supabase;
  };

  const sendEmailCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      setFormError('Enter a valid email address.');
      return;
    }

    setFormError(undefined);
    setBusy(true);
    try {
      const { error } = await requireSupabase().auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setVerifying(true);
    } catch (error) {
      setFormError(authErrorMessage(error, 'Unable to send a verification code.'));
    } finally {
      setBusy(false);
    }
  };

  const verifyEmailCode = async () => {
    if (!code.trim()) {
      setFormError('Enter the verification code from your email.');
      return;
    }

    setFormError(undefined);
    setBusy(true);
    try {
      const { data, error } = await requireSupabase().auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
      });
      if (error) throw error;
      if (!data.session) throw new Error('Supabase did not create a session for this code.');
      router.replace('/');
    } catch (error) {
      setFormError(authErrorMessage(error, 'That verification code could not be accepted.'));
    } finally {
      setBusy(false);
    }
  };

  const continueWithGoogle = async () => {
    setFormError(undefined);
    setSocialBusy(true);
    try {
      const client = requireSupabase();
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: GOOGLE_REDIRECT_URL,
          queryParams: { prompt: 'consent' },
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error('Supabase did not return a Google sign-in URL.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, GOOGLE_REDIRECT_URL, {
        showInRecents: true,
      });
      if (result.type === 'cancel' || result.type === 'dismiss') return;
      if (result.type !== 'success') throw new Error('Google sign-in did not complete.');

      const { accessToken, refreshToken } = sessionTokensFromUrl(result.url);
      if (!accessToken || !refreshToken) {
        throw new Error('Google sign-in returned without a Supabase session.');
      }
      const { error: sessionError } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) throw sessionError;
      router.replace('/');
    } catch (error) {
      setFormError(authErrorMessage(error, 'Unable to continue with Google.'));
    } finally {
      setSocialBusy(false);
    }
  };

  const resetEmailFlow = () => {
    setCode('');
    setVerifying(false);
    setFormError(undefined);
  };

  return (
    <ScrollScreen keyboardAware contentContainerStyle={styles.scroll}>
      <ScreenHeader onBack={() => router.back()} />
      <View style={styles.content} testID="auth-sign-in-screen">
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>WELCOME TO INVITE</Text>
          <Text style={styles.title}>
            {verifying ? 'Check your email.' : 'One code. No password to remember.'}
          </Text>
          <Text style={styles.subtitle}>
            {verifying
              ? `Enter the code sent to ${email.trim()}.`
              : 'Use email or Google. If you are new, the same flow creates your identity before you finish your Invite profile.'}
          </Text>
        </View>

        <View style={styles.form}>
          {verifying ? (
            <>
              <InputField
                autoCapitalize="none"
                autoComplete="one-time-code"
                keyboardType="number-pad"
                label="Verification code"
                onChangeText={setCode}
                onSubmitEditing={() => void verifyEmailCode()}
                placeholder="6-digit code"
                returnKeyType="done"
                testID="auth-code"
                value={code}
              />
              {formError ? (
                <Text accessibilityRole="alert" style={styles.error} testID="auth-error">
                  {formError}
                </Text>
              ) : null}
              <Button
                label="Verify and continue"
                loading={busy}
                onPress={() => void verifyEmailCode()}
                testID="auth-verify-code"
              />
              <Button
                fullWidth={false}
                label="Send a new code"
                onPress={() => void sendEmailCode()}
                variant="ghost"
              />
              <Button
                fullWidth={false}
                label="Use a different email"
                onPress={resetEmailFlow}
                variant="ghost"
              />
            </>
          ) : (
            <>
              <InputField
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label="Email"
                onChangeText={setEmail}
                onSubmitEditing={() => void sendEmailCode()}
                placeholder="you@example.com"
                returnKeyType="done"
                testID="auth-email"
                value={email}
              />
              {formError ? (
                <Text accessibilityRole="alert" style={styles.error} testID="auth-error">
                  {formError}
                </Text>
              ) : null}
              <Button
                label="Email me a code"
                loading={busy}
                onPress={() => void sendEmailCode()}
                testID="auth-submit"
              />
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.divider} />
              </View>
              <Button
                label="Continue with Google"
                loading={socialBusy}
                onPress={() => void continueWithGoogle()}
                testID="auth-google"
                variant="outline"
              />
            </>
          )}
        </View>

        <Text style={styles.managedAuthNote}>
          New users will choose interests, availability, and connection goals after identity verification.
        </Text>
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
          <Button
            label="Sign in"
            loading={state.busy}
            onPress={() => void submit()}
            testID="auth-submit"
          />
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
  return isSupabaseAuthConfigured ? <SupabaseSignInScreen /> : <LegacySignInScreen />;
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
  managedAuthNote: { ...typography.small, color: palette.inkMuted, textAlign: 'center' },
});
