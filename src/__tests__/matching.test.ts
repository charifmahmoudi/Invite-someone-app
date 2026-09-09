import { recommendProfiles, scoreProfileForActivity } from '@/domain/matching';
import { createSeedData, DEMO_USER_ID } from '@/data/seed';

describe('transparent people matching', () => {
  const data = createSeedData();
  const activity = data.activities.find((item) => item.id === 'activity-run')!;
  const host = data.profiles.find((profile) => profile.id === activity.hostId)!;

  it('US-03 explains scores using only activity-relevant signals', () => {
    const candidate = data.profiles.find((profile) => profile.id === DEMO_USER_ID)!;
    const result = scoreProfileForActivity(candidate, activity, host);
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons).toEqual(expect.arrayContaining(['Nearby']));
    expect(result.reasons.join(' ')).not.toMatch(/age|gender|ethnicity/i);
  });

  it('US-05 excludes the host, current attendees, and already-invited people', () => {
    const recommendations = recommendProfiles(data.profiles, activity, host);
    const ids = recommendations.map((result) => result.profile.id);
    expect(ids).not.toContain(activity.hostId);
    activity.attendeeIds.forEach((id) => expect(ids).not.toContain(id));
    activity.invitedIds.forEach((id) => expect(ids).not.toContain(id));
  });

  it('US-05 ranks a same-category local above a less relevant candidate', () => {
    const recommendations = recommendProfiles(data.profiles, activity, host);
    const sporty = recommendations.find((result) => result.profile.id === 'profile-emma')!;
    const foodFocused = recommendations.find((result) => result.profile.id === 'profile-sofia')!;
    expect(sporty.score).toBeGreaterThan(foodFocused.score);
  });
});
