import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProfileCard } from '@/components/profile-card';
import { ChoiceChip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { palette, spacing, typography } from '@/constants/theme';
import { useApp, useCurrentProfile } from '@/state/app-context';
import { ACTIVITY_CATEGORIES, type ActivityCategory } from '@/types/domain';

export default function PeopleScreen() {
  const router = useRouter();
  const { state } = useApp();
  const currentProfile = useCurrentProfile();
  const [query, setQuery] = useState('');
  const [interest, setInterest] = useState<ActivityCategory | 'All'>('All');

  const people = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return state.profiles
      .filter((profile) => profile.id !== state.session?.userId)
      .filter(
        (profile) => interest === 'All' || profile.interests.some((item) => item === interest),
      )
      .filter(
        (profile) =>
          !normalized ||
          profile.name.toLowerCase().includes(normalized) ||
          profile.city.toLowerCase().includes(normalized) ||
          profile.headline.toLowerCase().includes(normalized) ||
          profile.interests.some((item) => item.toLowerCase().includes(normalized)),
      )
      .sort((left, right) => {
        const sharedLeft = left.interests.filter((item) =>
          currentProfile?.interests.includes(item),
        ).length;
        const sharedRight = right.interests.filter((item) =>
          currentProfile?.interests.includes(item),
        ).length;
        return sharedRight - sharedLeft || left.name.localeCompare(right.name);
      });
  }, [currentProfile?.interests, interest, query, state.profiles, state.session?.userId]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>YOUR LOCAL CIRCLE</Text>
          <Text style={styles.title}>People worth inviting</Text>
          <Text style={styles.subtitle}>
            Start with a shared interest. Let familiarity grow one plan at a time.
          </Text>
        </View>

        <SearchField
          onChangeText={setQuery}
          placeholder="Search people, interests, or city"
          value={query}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <ChoiceChip
            label="All"
            onPress={() => setInterest('All')}
            selected={interest === 'All'}
          />
          {ACTIVITY_CATEGORIES.map((item) => (
            <ChoiceChip
              key={item}
              label={item}
              onPress={() => setInterest(item)}
              selected={interest === item}
            />
          ))}
        </ScrollView>

        <Text style={styles.count}>{people.length} people</Text>
        <View style={styles.cards}>
          {people.map((profile) => {
            const shared = profile.interests.filter((item) =>
              currentProfile?.interests.includes(item),
            );
            const reasons = [
              ...(shared.length > 0
                ? [`${shared.length} shared interest${shared.length === 1 ? '' : 's'}`]
                : []),
              ...(profile.city === currentProfile?.city ? ['Nearby'] : []),
            ];
            return (
              <ProfileCard
                key={profile.id}
                onPress={() =>
                  router.push({ pathname: '/person/[id]', params: { id: profile.id } })
                }
                profile={profile}
                reasons={reasons}
              />
            );
          })}
        </View>
        {people.length === 0 ? (
          <Text style={styles.empty}>No one matches that search yet. Try a broader interest.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg },
  heading: { gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.sm },
  eyebrow: { ...typography.micro, color: palette.primaryDark },
  title: { ...typography.h1, color: palette.ink },
  subtitle: { ...typography.body, color: palette.inkMuted },
  filters: { gap: spacing.sm, paddingRight: spacing.lg },
  count: { ...typography.label, color: palette.inkMuted },
  cards: { gap: spacing.md },
  empty: {
    ...typography.body,
    color: palette.inkMuted,
    textAlign: 'center',
    padding: spacing.xxxl,
  },
});
