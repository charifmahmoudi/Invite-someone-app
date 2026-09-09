import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { isFirebaseAuthConfigured, useManagedAuth } from '@/auth/firebase-provider';
import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { ScrollScreen } from '@/components/ui/screen';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { useApp } from '@/state/app-context';

const benefits = [
  { icon: 'sparkles' as const, text: 'Find people who enjoy the same things' },
  { icon: 'calendar' as const, text: 'Make a small plan in under a minute' },
  { icon: 'group' as const, text: 'Turn repeated invites into real community' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { startDemo, state } = useApp();
  const managedAuth = useManagedAuth();

  useEffect(() => {
    if (
      managedAuth.enabled &&
      managedAuth.identityLoaded &&
      managedAuth.identitySignedIn &&
      !state.session
    ) {
      router.replace('/(auth)/sign-up');
    }
  }, [managedAuth.enabled, managedAuth.identityLoaded, managedAuth.identitySignedIn, router, state.session]);

  const openDemo = async () => {
    try {
      await startDemo();
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Could not open the demo', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const startProfile = () => {
    router.push('/(auth)/sign-up');
  };

  return (
    <ScrollScreen contentContainerStyle={styles.scroll}>
      <View style={styles.page} testID="welcome-screen">
        <LinearGradient colors={['#FBE2D9', '#E3ECE4', '#F7F6F1']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.hero}>
          <View style={styles.brandMark}><View style={styles.brandDot} /><Text style={styles.brand}>invite</Text></View>
          <View style={styles.orbits} accessibilityElementsHidden>
            <View style={[styles.personDot, styles.dotOne]} />
            <View style={[styles.personDot, styles.dotTwo]} />
            <View style={[styles.personDot, styles.dotThree]} />
            <View style={styles.connector} />
          </View>
          <View>
            <Text style={styles.eyebrow}>SMALL PLANS · REAL CONNECTIONS</Text>
            <Text style={styles.title}>Making friends can start with one simple invite.</Text>
            <Text style={styles.subtitle}>Meet compatible people through coffee, walks, games, food, and the things you already love.</Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.benefits}>
            {benefits.map((benefit) => (
              <View key={benefit.text} style={styles.benefitRow}>
                <View style={styles.benefitIcon}><AppIcon name={benefit.icon} color={palette.forest} size={20} /></View>
                <Text style={styles.benefitText}>{benefit.text}</Text>
              </View>
            ))}
          </View>
          <View style={styles.actions}>
            <Button label="Create your profile" onPress={startProfile} />
            <Button label="Explore the demo" loading={state.busy} onPress={() => void openDemo()} variant="outline" />
            <Button fullWidth label="I already have an account" onPress={() => router.push('/(auth)/sign-in')} testID="welcome-sign-in" variant="ghost" />
          </View>
          {isFirebaseAuthConfigured ? (
            <Text style={styles.managedNote}>Accounts are secured by Firebase Authentication.</Text>
          ) : null}
          <Text style={styles.legal}>By continuing, you agree to be respectful, keep plans safe, and treat every invitation as optional.</Text>
        </View>
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 0 },
  page: { flex: 1 },
  hero: { minHeight: 500, justifyContent: 'space-between', paddingHorizontal: spacing.xxl, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  brandMark: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: palette.primary },
  brand: { ...typography.h3, color: palette.ink, letterSpacing: -0.4 },
  orbits: { alignSelf: 'center', width: 220, height: 132, position: 'relative' },
  personDot: { position: 'absolute', width: 58, height: 58, borderRadius: 29, borderWidth: 5, borderColor: palette.white },
  dotOne: { backgroundColor: palette.primary, left: 8, top: 42 },
  dotTwo: { backgroundColor: palette.forest, right: 8, top: 38 },
  dotThree: { backgroundColor: palette.amber, left: 82, top: 0 },
  connector: { position: 'absolute', width: 118, height: 62, left: 50, top: 40, borderRadius: 60, borderWidth: 2, borderColor: 'rgba(49,92,76,0.22)' },
  eyebrow: { ...typography.micro, color: palette.primaryDark, marginBottom: spacing.md },
  title: { ...typography.display, color: palette.ink },
  subtitle: { ...typography.body, color: palette.inkMuted, marginTop: spacing.lg, maxWidth: 520 },
  content: { padding: spacing.xxl, gap: spacing.xxl },
  benefits: { gap: spacing.lg },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  benefitIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.forestSoft },
  benefitText: { ...typography.bodyStrong, color: palette.ink, flex: 1 },
  actions: { gap: spacing.md },
  managedNote: { ...typography.small, color: palette.inkMuted, textAlign: 'center' },
  legal: { ...typography.small, color: palette.inkMuted, textAlign: 'center' },
});
