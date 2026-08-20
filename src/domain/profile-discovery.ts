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

export type LocatedProfile = Profile & {
  approximateLocation: NonNullable<Profile['approximateLocation']>;
};

/** MapLibre uses a flat west/south/east/north bounds tuple. */
export type ApproximateMapBounds = [west: number, south: number, east: number, north: number];

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

export const profilesWithApproximateLocations = (profiles: Profile[]): LocatedProfile[] =>
  profiles.filter(
    (profile): profile is LocatedProfile => profile.approximateLocation !== undefined,
  );

/**
 * Produces non-degenerate bounds for the real map. A single area is expanded to a
 * neighbourhood-sized viewport; the coordinates still remain broad public centroids.
 */
export const approximateMapBounds = (profiles: Profile[]): ApproximateMapBounds | undefined => {
  const locatedProfiles = profilesWithApproximateLocations(profiles);
  if (locatedProfiles.length === 0) return undefined;

  const longitudes = locatedProfiles.map((profile) => profile.approximateLocation.coordinates[0]);
  const latitudes = locatedProfiles.map((profile) => profile.approximateLocation.coordinates[1]);
  let west = Math.min(...longitudes);
  let east = Math.max(...longitudes);
  let south = Math.min(...latitudes);
  let north = Math.max(...latitudes);

  // Roughly two kilometres at European latitudes; enough context without implying precision.
  const minimumSpan = 0.025;
  if (east - west < minimumSpan) {
    const centre = (east + west) / 2;
    west = centre - minimumSpan / 2;
    east = centre + minimumSpan / 2;
  }
  if (north - south < minimumSpan) {
    const centre = (north + south) / 2;
    south = centre - minimumSpan / 2;
    north = centre + minimumSpan / 2;
  }

  return [west, south, east, north];
};
