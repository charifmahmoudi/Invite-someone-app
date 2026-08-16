import type { Activity, Profile } from '@/types/domain';

export interface MatchResult {
  profile: Profile;
  score: number;
  reasons: string[];
}

/**
 * A transparent, deterministic recommendation score. It intentionally avoids
 * sensitive traits: only interests, city, availability, and participation
 * reliability are considered.
 */
export const scoreProfileForActivity = (
  profile: Profile,
  activity: Activity,
  host: Profile,
): MatchResult => {
  const reasons: string[] = [];
  let score = 0;

  if (profile.interests.includes(activity.category)) {
    score += 45;
    reasons.push(`Likes ${activity.category.toLowerCase()}`);
  }

  const sharedInterests = profile.interests.filter((interest) => host.interests.includes(interest));
  if (sharedInterests.length > 0) {
    score += Math.min(sharedInterests.length * 8, 24);
    reasons.push(
      `${sharedInterests.length} shared interest${sharedInterests.length === 1 ? '' : 's'}`,
    );
  }

  if (profile.city.trim().toLowerCase() === activity.city.trim().toLowerCase()) {
    score += 18;
    reasons.push('Nearby');
  }

  if (profile.reliabilityScore >= 95) {
    score += 8;
    reasons.push('Reliable guest');
  }

  return { profile, score, reasons };
};

export const recommendProfiles = (
  profiles: Profile[],
  activity: Activity,
  host: Profile,
): MatchResult[] =>
  profiles
    .filter(
      (profile) =>
        profile.id !== host.id &&
        !activity.attendeeIds.includes(profile.id) &&
        !activity.invitedIds.includes(profile.id),
    )
    .map((profile) => scoreProfileForActivity(profile, activity, host))
    .sort(
      (left, right) =>
        right.score - left.score || left.profile.name.localeCompare(right.profile.name),
    );
