import { isClerkAPIResponseError, useSignIn, useSignUp, useSSO } from '@clerk/expo';
import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { isClerkConfigured } from '@/auth/clerk-provider';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ScrollScreen } from '@/components/ui/screen';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { firstValidationMessage, signInSchema } from '@/domain/validation';
import { useApp } from '@/state/app-context';

WebBrowser.maybeCompleteAuthSession();

const clerkErrorMessage = (error: unknown, fallback: string) => {
  if (isClerkAPIResponseError(error)) {
    return error.errors[0]?.longMessage ?? error.errors[0]?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

function ClerkSignInScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);
  const [formError, setFormError] = useState<string>();

  const sendEmailCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      setFormError('Enter a valid email address.');
      return;
    }

    setFormError(undefined);
    const { error: createError } = await signIn.create({
      identifier: email.trim(),
      signUpIfMissing: true,
    } as Parameters<typeof signIn.create>[0]);
    if (createError) {
      setFormError(clerkErrorMessage(createError, 'Unable to start email sign-in.'));
      return;
    }

    const { error: sendError } = await signIn.emailCode.sendCode();
    if (sendError) {
      setFormError(clerkErrorMessage(sendError, 'Unable to send a verification code.'));
      return;
    }

    setVerifying(true);
  };

  const finishAuthentication = () => {
    router.replace('/');
  };

  const verifyEmailCode = async () => {
    if (!code.trim()) {
      setFormError('Enter the verification code from your email.');
      return;
    }

    setFormError(undefined);
    const { error } = await signIn.emailCode.verifyCode({ code: code.trim() });

    if (error) {
      const shouldTransferToSignUp =
        isClerkAPIResponseError(error) &&
        error.errors.some((item) => item.code === 'sign_up_if_missing_transfer');

      if (!shouldTransferToSignUp) {
        setFormError(clerkErrorMessage(error, 'That verification code could not be accepted.'));
        return;
      }

      const { error: transferError } = await signUp.create({ transfer: true });
      if (transferError) {
        setFormError(clerkErrorMessage(transferError, 'Unable to create your Clerk account.'));
        return;
      }

      if (signUp.status !== 'complete') {
        setFormError(
          'Your Clerk instance requires additional identity fields. Configure Clerk to require only a verified email for this Invite flow.',
        );
        return;
      }

      const { error: finalizeError } = await signUp.finalize();
      if (finalizeError) {
        setFormError(clerkErrorMessage(finalizeError, 'Unable to finish account creation.'));
        return;
      }
      finishAuthentication();
      return;
    }

    if (signIn.status !== 'complete') {
      setFormError('This account requires an additional authentication step that Invite does not support yet.');
      return;
    }

    const { error: finalizeError } = await signIn.finalize();
    if (finalizeError) {
      setFormError(clerkErrorMessage(finalizeError, 'Unable to finish sign-in.'));
      return;
    }
    finishAuthentication();
  };

  const continueWithGoogle = async () => {
    setFormError(undefined);
    setSocialBusy(true);
    try {
      const result = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri({ scheme: 'invite', path: 'sso-callback' }),
      });

      if (result.authSessionResult?.type === 'cancel' || result.authSessionResult?.type === 'dismiss') {
        return;
      }

      if (!result.createdSessionId || !result.setActive) {
        setFormError(
          'Google sign-in needs another authentication step. Check the Clerk social connection configuration.',
        );
        return;
      }

      await result.setActive({ session: result.createdSessionId });
      finishAuthentication();
    } catch (error) {
      setFormError(clerkErrorMessage(error, 'Unable to continue with Google.'));
    } finally {
      setSocialBusy(false);
    }
  };

  const resetEmailFlow = () => {
    signIn.reset();
    setCode('');
    setVerifying(false);
    setFormError(undefined);
  };

  const busy = fetchStatus === 'fetching';

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
              : 'Use email or Google. If you are new, the same flow creates your account before you finish your Invite profile.'}
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
                onPress={() => void signIn.emailCode.sendCode()}
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
              <View nativeID="clerk-captcha" />
            </>
          )}
        </View>

        <Text style={styles.clerkNote}>
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
  return isClerkConfigured ? <ClerkSignInScreen /> : <LegacySignInScreen />;
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
  clerkNote: { ...typography.small, color: palette.inkMuted, textAlign: 'center' },
});