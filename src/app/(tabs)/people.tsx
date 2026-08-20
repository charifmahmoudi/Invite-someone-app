import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PeopleMap } from '@/components/people-map';
import { ProfileCard } from '@/components/profile-card';
import { Button } from '@/components/ui/button';
import { ChoiceChip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { palette, radius, spacing, typography } from '@/constants/theme';
import {
  discoverProfiles,
  formatApproximateDistance,
  type ProfileDiscoveryFilters,
} from '@/domain/profile-discovery';
import { useApp, useCurrentProfile } from '@/state/app-context';
import {
  ACTIVITY_CATEGORIES,
  AVAILABILITY_OPTIONS,
  CONNECTION_GOALS,
  type ActivityCategory,
  type Profile,
} from '@/types/domain';

const toggleValue = <T extends string>(values: T[], value: T) =>
  values.includes(value) ? values.filter((candidate) => candidate !== value) : [...values, value];

export default function PeopleScreen() {
  const router = useRouter();
  const { state } = useApp();
  const currentProfile = useCurrentProfile();
  const [query, setQuery] = useState('');
  const [interests, setInterests] = useState<ActivityCategory[]>([]);
  const [availability, setAvailability] = useState<string>();
  const [connectionGoal, setConnectionGoal] = useState<string>();
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>();
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const filters: ProfileDiscoveryFilters = useMemo(
    () => ({
      query,
      interests,
      availability,
      connectionGoal,
      maxDistanceKm,
      verifiedOnly,
    }),
    [availability, connectionGoal, interests, maxDistanceKm, query, verifiedOnly],
  );
  const results = useMemo(
    () => discoverProfiles(state.profiles, currentProfile, filters),
    [currentProfile, filters, state.profiles],
  );
  const appliedFilterCount =
    interests.length +
    Number(Boolean(availability)) +
    Number(Boolean(connectionGoal)) +
    Number(Boolean(maxDistanceKm)) +
    Number(verifiedOnly);

  const clearFilters = () => {
    setInterests([]);
    setAvailability(undefined);
    setConnectionGoal(undefined);
    setMaxDistanceKm(undefined);
    setVerifiedOnly(false);
  };
  const openProfile = useCallback(
    (profile: Profile) => router.push({ pathname: '/person/[id]', params: { id: profile.id } }),
    [router],
  );

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>YOUR LOCAL CIRCLE</Text>
          <Text style={styles.title}>People worth inviting</Text>
          <Text style={styles.subtitle}>
            Browse genuine introductions, find common ground, then make the first move with a small
            plan.
          </Text>
        </View>

        <SearchField
          onChangeText={setQuery}
          placeholder="Search names, bios, interests, or areas"
          value={query}
        />

        <View style={styles.toolbar}>
          <View style={styles.viewChoices}>
            <ChoiceChip
              label="List"
              onPress={() => setViewMode('list')}
              selected={viewMode === 'list'}
            />
            <ChoiceChip
              label="Map"
              onPress={() => setViewMode('map')}
              selected={viewMode === 'map'}
            />
          </View>
          <ChoiceChip
            label={`Filters${appliedFilterCount > 0 ? ` · ${appliedFilterCount}` : ''}`}
            onPress={() => setShowFilters((visible) => !visible)}
            selected={showFilters || appliedFilterCount > 0}
          />
        </View>

        {showFilters ? (
          <View style={styles.filterPanel}>
            <View style={styles.filterHeading}>
              <View style={styles.filterHeadingCopy}>
                <Text style={styles.filterTitle}>Find the right fit</Text>
                <Text style={styles.filterSubtitle}>
                  Choose several interests to broaden results.
                </Text>
              </View>
              <Button
                disabled={appliedFilterCount === 0}
                fullWidth={false}
                label="Clear"
                onPress={clearFilters}
                variant="ghost"
              />
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Interests</Text>
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

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Distance from my approximate area</Text>
              {currentProfile?.approximateLocation ? (
                <View style={styles.chips}>
                  {[
                    { label: 'Any distance', value: undefined },
                    { label: 'Within 5 km', value: 5 },
                    { label: 'Within 15 km', value: 15 },
                    { label: 'Within 50 km', value: 50 },
                  ].map((option) => (
                    <ChoiceChip
                      key={option.label}
                      label={option.label}
                      onPress={() => setMaxDistanceKm(option.value)}
                      selected={maxDistanceKm === option.value}
                    />
                  ))}
                </View>
              ) : (
                <Text style={styles.filterHelp}>
                  Add an approximate area to your profile to filter by distance.
                </Text>
              )}
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Usually free</Text>
              <View style={styles.chips}>
                <ChoiceChip
                  label="Any time"
                  onPress={() => setAvailability(undefined)}
                  selected={!availability}
                />
                {AVAILABILITY_OPTIONS.map((item) => (
                  <ChoiceChip
                    key={item}
                    label={item}
                    onPress={() => setAvailability(item)}
                    selected={availability === item}
                  />
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Looking for</Text>
              <View style={styles.chips}>
                <ChoiceChip
                  label="Any goal"
                  onPress={() => setConnectionGoal(undefined)}
                  selected={!connectionGoal}
                />
                {CONNECTION_GOALS.map((item) => (
                  <ChoiceChip
                    key={item}
                    label={item}
                    onPress={() => setConnectionGoal(item)}
                    selected={connectionGoal === item}
                  />
                ))}
              </View>
            </View>

            <ChoiceChip
              label="Verified profiles only"
              onPress={() => setVerifiedOnly((value) => !value)}
              selected={verifiedOnly}
            />
          </View>
        ) : null}

        <View style={styles.resultHeading}>
          <Text style={styles.count}>
            {results.length} {results.length === 1 ? 'person' : 'people'}
          </Text>
          <Text style={styles.orderHint}>
            {viewMode === 'map' ? 'Approximate areas' : 'Common ground first'}
          </Text>
        </View>

        {results.length > 0 && viewMode === 'map' ? (
          <PeopleMap
            onSelectProfile={openProfile}
            profiles={results.map(({ profile }) => profile)}
          />
        ) : null}

        {results.length > 0 && viewMode === 'list' ? (
          <View style={styles.cards}>
            {results.map(({ profile, sharedInterests, distanceKm }) => {
              const distance = formatApproximateDistance(distanceKm);
              const reasons = [
                ...(sharedInterests.length > 0
                  ? [
                      `${sharedInterests.length} shared interest${
                        sharedInterests.length === 1 ? '' : 's'
                      }`,
                    ]
                  : []),
                ...(distance ? [distance] : []),
              ];
              return (
                <ProfileCard
                  key={profile.id}
                  onPress={() => openProfile(profile)}
                  profile={profile}
                  reasons={reasons}
                />
              );
            })}
          </View>
        ) : null}

        {results.length === 0 ? (
          <EmptyState
            action={
              <Button
                fullWidth={false}
                label="Clear filters"
                onPress={() => {
                  setQuery('');
                  clearFilters();
                }}
                variant="outline"
              />
            }
            body="Try a wider distance, another interest, or a more general search."
            icon="people"
            title="No matching people yet"
          />
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  viewChoices: { flexDirection: 'row', gap: spacing.sm },
  filterPanel: {
    gap: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.lg,
  },
  filterHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  filterHeadingCopy: { flex: 1, gap: 2 },
  filterTitle: { ...typography.h3, color: palette.ink },
  filterSubtitle: { ...typography.small, color: palette.inkMuted },
  filterGroup: { gap: spacing.sm },
  filterLabel: { ...typography.label, color: palette.ink },
  filterHelp: { ...typography.small, color: palette.inkMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  resultHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { ...typography.label, color: palette.ink },
  orderHint: { ...typography.small, color: palette.inkMuted },
  cards: { gap: spacing.md },
});
