import {
  approximateDistanceKm,
  discoverProfiles,
  projectProfilesForMap,
  type ProfileDiscoveryFilters,
} from '@/domain/profile-discovery';
import { seedProfiles } from '@/data/seed';

const baseFilters: ProfileDiscoveryFilters = {
  query: '',
  interests: [],
  verifiedOnly: false,
};

describe('people discovery', () => {
  const currentProfile = seedProfiles[0];

  it('US-03 searches descriptions, interests, and approximate areas', () => {
    const bioResult = discoverProfiles(seedProfiles, currentProfile, {
      ...baseFilters,
      query: 'noodle',
    });
    const areaResult = discoverProfiles(seedProfiles, currentProfile, {
      ...baseFilters,
      query: 'Moabit',
    });

    expect(bioResult.map(({ profile }) => profile.id)).toEqual(['profile-maya']);
    expect(areaResult.map(({ profile }) => profile.id)).toEqual(['profile-nadia']);
  });

  it('US-11 combines interest, availability, goal, distance, and trust filters', () => {
    const result = discoverProfiles(seedProfiles, currentProfile, {
      ...baseFilters,
      interests: ['Arts'],
      availability: 'Sunday',
      connectionGoal: 'New friends',
      maxDistanceKm: 10,
      verifiedOnly: true,
    });

    expect(result.map(({ profile }) => profile.id)).toEqual(['profile-maya', 'profile-sofia']);
  });

  it('US-12 uses broad coordinates for distance and bounded map pins', () => {
    expect(approximateDistanceKm(seedProfiles[0], seedProfiles[1])).toBeLessThan(10);

    const points = projectProfilesForMap(seedProfiles);
    expect(points).toHaveLength(seedProfiles.length);
    points.forEach(({ x, y }) => {
      expect(x).toBeGreaterThanOrEqual(0.1);
      expect(x).toBeLessThanOrEqual(0.9);
      expect(y).toBeGreaterThanOrEqual(0.1);
      expect(y).toBeLessThanOrEqual(0.9);
    });
  });
});
