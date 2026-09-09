import type { ActivityCategory, Profile } from '@/types/domain';

export interface ProfileDiscoveryFilters {
  query: string;
  interests: ActivityCategory[];
  availability?: string;
  connectionGoal?: string;
  maxDistanceKm?: number;
  verifiedOnly: boolean;
}

export interface ProfileDiscoveryResult {
  profile: Profile;
  distanceKm?: number;
  sharedInterests: ActivityCategory[];
}

export interface ProfileMapPoint {
  profile: Profile;
  x: number;
  y: number;
}

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Returns a coarse centroid-to-centroid distance, never a route or exact home distance. */
export const approximateDistanceKm = (left: Profile, right: Profile): number | undefined => {
  const leftCoordinates = left.approximateLocation?.coordinates;
  const rightCoordinates = right.approximateLocation?.coordinates;
  if (!leftCoordinates || !rightCoordinates) return undefined;

  const [leftLongitude, leftLatitude] = leftCoordinates;
  const [rightLongitude, rightLatitude] = rightCoordinates;
  const latitudeDelta = toRadians(rightLatitude - leftLatitude);
  const longitudeDelta = toRadians(rightLongitude - leftLongitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(leftLatitude)) *
      Math.cos(toRadians(rightLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

const containsQuery = (profile: Profile, query: string) => {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;

  return [
    profile.name,
    profile.handle,
    profile.headline,
    profile.bio,
    profile.city,
    profile.approximateLocation?.area ?? '',
    ...profile.interests,
    ...profile.availability,
    ...profile.connectionGoals,
  ].some((value) => value.toLocaleLowerCase().includes(normalized));
};

/**
 * Privacy-conscious people discovery. Only self-declared profile fields and broad
 * neighbourhood centroids are used; sensitive traits never enter the ranking.
 */
export const discoverProfiles = (
  profiles: Profile[],
  currentProfile: Profile | undefined,
  filters: ProfileDiscoveryFilters,
): ProfileDiscoveryResult[] =>
  profiles
    .filter((profile) => profile.id !== currentProfile?.id)
    .map((profile) => ({
      profile,
      distanceKm: currentProfile ? approximateDistanceKm(currentProfile, profile) : undefined,
      sharedInterests: profile.interests.filter((interest) =>
        currentProfile?.interests.includes(interest),
      ),
    }))
    .filter(({ profile }) => containsQuery(profile, filters.query))
    .filter(
      ({ profile }) =>
        filters.interests.length === 0 ||
        filters.interests.some((interest) => profile.interests.includes(interest)),
    )
    .filter(
      ({ profile }) => !filters.availability || profile.availability.includes(filters.availability),
    )
    .filter(
      ({ profile }) =>
        !filters.connectionGoal || profile.connectionGoals.includes(filters.connectionGoal),
    )
    .filter(({ profile }) => !filters.verifiedOnly || profile.isVerified === true)
    .filter(
      ({ distanceKm }) =>
        filters.maxDistanceKm === undefined ||
        (distanceKm !== undefined && distanceKm <= filters.maxDistanceKm),
    )
    .sort(
      (left, right) =>
        right.sharedInterests.length - left.sharedInterests.length ||
        (left.distanceKm ?? Number.POSITIVE_INFINITY) -
          (right.distanceKm ?? Number.POSITIVE_INFINITY) ||
        left.profile.name.localeCompare(right.profile.name),
    );

export const formatApproximateDistance = (distanceKm: number | undefined) => {
  if (distanceKm === undefined) return undefined;
  if (distanceKm < 1) return 'Less than 1 km away';
  return `About ${Math.round(distanceKm)} km away`;
};

/** Projects GeoJSON coordinates into a padded 0–1 map surface for the native privacy map. */
export const projectProfilesForMap = (profiles: Profile[]): ProfileMapPoint[] => {
  const locatedProfiles = profiles.filter(
    (
      profile,
    ): profile is Profile & { approximateLocation: NonNullable<Profile['approximateLocation']> } =>
      profile.approximateLocation !== undefined,
  );
  if (locatedProfiles.length === 0) return [];

  const longitudes = locatedProfiles.map((profile) => profile.approximateLocation.coordinates[0]);
  const latitudes = locatedProfiles.map((profile) => profile.approximateLocation.coordinates[1]);
  const longitudeMin = Math.min(...longitudes);
  const longitudeSpan = Math.max(...longitudes) - longitudeMin;
  const latitudeMin = Math.min(...latitudes);
  const latitudeSpan = Math.max(...latitudes) - latitudeMin;
  const padding = 0.12;
  const usable = 1 - padding * 2;

  return locatedProfiles.map((profile) => {
    const [longitude, latitude] = profile.approximateLocation.coordinates;
    return {
      profile,
      x:
        longitudeSpan < 0.0001
          ? 0.5
          : padding + ((longitude - longitudeMin) / longitudeSpan) * usable,
      // Native layouts grow downward, so north (larger latitude) maps toward zero.
      y:
        latitudeSpan < 0.0001
          ? 0.5
          : padding + (1 - (latitude - latitudeMin) / latitudeSpan) * usable,
    };
  });
};
