import {
  approximateMapBounds,
  approximateDistanceKm,
  discoverProfiles,
  profilesWithApproximateLocations,
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

  it('US-12 uses broad coordinates and fits them inside real map bounds', () => {
    expect(approximateDistanceKm(seedProfiles[0], seedProfiles[1])).toBeLessThan(10);

    const locatedProfiles = profilesWithApproximateLocations(seedProfiles);
    const bounds = approximateMapBounds(seedProfiles);
    expect(locatedProfiles).toHaveLength(seedProfiles.length);
    expect(bounds).toBeDefined();
    const [west, south, east, north] = bounds!;
    locatedProfiles.forEach(({ approximateLocation }) => {
      const [longitude, latitude] = approximateLocation.coordinates;
      expect(longitude).toBeGreaterThanOrEqual(west);
      expect(longitude).toBeLessThanOrEqual(east);
      expect(latitude).toBeGreaterThanOrEqual(south);
      expect(latitude).toBeLessThanOrEqual(north);
    });
  });

  it('US-12 expands one broad area into a usable map viewport', () => {
    const bounds = approximateMapBounds([seedProfiles[0]]);
    expect(bounds).toBeDefined();
    expect(bounds![2] - bounds![0]).toBeCloseTo(0.025, 6);
    expect(bounds![3] - bounds![1]).toBeCloseTo(0.025, 6);
  });
});
