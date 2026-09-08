import { Linking, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ScrollScreen } from '@/components/ui/screen';
import { palette, radius, spacing, typography } from '@/constants/theme';

const SUPPORT_EMAIL = 'charif.mahmoudi.us@gmail.com';

const helpItems = [
  {
    icon: 'person' as const,
    title: 'Account and sign-in',
    body: 'Email/password accounts use Firebase. Verify your email before profile creation. If the server is temporarily unavailable, retry instead of creating another account.',
  },
  {
    icon: 'mail' as const,
    title: 'Password reset',
    body: 'On the sign-in screen, enter your email and choose Forgot password?. Firebase will send reset instructions if the account supports password sign-in.',
  },
  {
    icon: 'people' as const,
    title: 'Invitations are optional',
    body: 'Accept only plans you want to attend. “Not this time” is a normal response and never requires an explanation.',
  },
  {
    icon: 'location' as const,
    title: 'Approximate location',
    body: 'People discovery uses broad areas rather than exact home coordinates. First meetings should use public places.',
  },
];

export default function HelpScreen() {
  const router = useRouter();

  const contactSupport = () => {
    void Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Invite support request')}`,
    );
  };

  return (
    <ScrollScreen contentContainerStyle={styles.scroll}>
      <ScreenHeader eyebrow="HELP & SAFETY" onBack={() => router.back()} title="Need a hand?" />
      <View style={styles.content} testID="help-screen">
        <View style={styles.intro}>
          <Text style={styles.title}>Use Invite with confidence.</Text>
          <Text style={styles.subtitle}>
            Account recovery, plan basics, safety guidance, and a direct path to support.
          </Text>
        </View>

        <View style={styles.items}>
          {helpItems.map((item) => (
            <View key={item.title} style={styles.card}>
              <View style={styles.iconWrap}>
                <AppIcon color={palette.forest} name={item.icon} size={21} />
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBody}>{item.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.safetyCard}>
          <AppIcon color={palette.forest} name="shield" size={24} />
          <View style={styles.safetyCopy}>
            <Text style={styles.safetyTitle}>First-meeting safety</Text>
            <Text style={styles.safetyBody}>
              Meet in public, keep your own transport options, tell someone you trust where you are
              going, and leave whenever you want. A verified-email badge is not a background check.
            </Text>
          </View>
        </View>

        <View style={styles.support}>
          <Text style={styles.supportTitle}>Still need help?</Text>
          <Text style={styles.supportBody}>
            Contact Invite support with the approximate time, what you were trying to do, and the
            exact error message. Never send passwords, recovery links, or authentication tokens.
          </Text>
          <Button icon="mail" label="Contact support" onPress={contactSupport} />
          <Text style={styles.email}>{SUPPORT_EMAIL}</Text>
        </View>

        <Text style={styles.limitations}>
          Blocking, reporting, and self-service account deletion are required for the public MVP and
          remain part of the active hardening work until release notes state that they are available.
        </Text>
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
  items: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.lg,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.forestSoft,
  },
  cardCopy: { flex: 1, gap: spacing.xs },
  cardTitle: { ...typography.bodyStrong, color: palette.ink },
  cardBody: { ...typography.small, color: palette.inkMuted },
  safetyCard: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.forestSoft,
    padding: spacing.lg,
  },
  safetyCopy: { flex: 1, gap: spacing.xs },
  safetyTitle: { ...typography.h3, color: palette.forest },
  safetyBody: { ...typography.small, color: palette.forest },
  support: { gap: spacing.md },
  supportTitle: { ...typography.h2, color: palette.ink },
  supportBody: { ...typography.body, color: palette.inkMuted },
  email: { ...typography.small, color: palette.inkMuted, textAlign: 'center' },
  limitations: {
    ...typography.small,
    color: palette.inkMuted,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
});
