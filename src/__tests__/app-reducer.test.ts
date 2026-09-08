import { appReducer, createInitialState } from '@/domain/app-reducer';
import { createSeedData, DEMO_USER_ID } from '@/data/seed';
import type { Activity, Invitation } from '@/types/domain';

describe('core user story state transitions', () => {
  const readyState = () => ({
    ...createInitialState(createSeedData()),
    hydrated: true,
    session: { userId: DEMO_USER_ID, mode: 'demo' as const },
  });

  it('US-04 creates a hosted activity at the top of the feed', () => {
    const activity: Activity = {
      id: 'activity-new',
      hostId: DEMO_USER_ID,
      title: 'Tiny museum visit',
      description: 'A one-hour gallery visit with a coffee afterward for anyone who wants to stay.',
      category: 'Arts',
      startAt: new Date(Date.now() + 86_400_000).toISOString(),
      location: 'Local museum',
      city: 'Berlin',
      capacity: 4,
      attendeeIds: [DEMO_USER_ID],
      invitedIds: [],
      visibility: 'community',
      vibe: 'Easygoing',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    const next = appReducer(readyState(), { type: 'create-activity', activity });
    expect(next.activities[0]).toEqual(activity);
    expect(next.activities[0].attendeeIds).toContain(DEMO_USER_ID);
  });

  it('PLAN-02 updates the editable fields of a hosted plan', () => {
    const state = readyState();
    const existing = state.activities.find((item) => item.id === 'activity-games')!;
    const updated: Activity = { ...existing, title: 'Updated low-stakes game night', capacity: 8 };
    const next = appReducer(state, { type: 'update-activity', activity: updated });
    expect(next.activities.find((item) => item.id === existing.id)?.title).toBe(updated.title);
    expect(next.activities.find((item) => item.id === existing.id)?.capacity).toBe(8);
  });

  it('PLAN-03 cancels a plan without deleting history and cancels pending invitations', () => {
    const cancelledAt = new Date().toISOString();
    const next = appReducer(readyState(), {
      type: 'cancel-activity',
      activityId: 'activity-games',
      cancelledAt,
    });
    const activity = next.activities.find((item) => item.id === 'activity-games');
    expect(activity?.status).toBe('cancelled');
    expect(activity?.cancelledAt).toBe(cancelledAt);
    expect(next.invitations.find((item) => item.id === 'invite-games-nadia')?.status).toBe(
      'cancelled',
    );
    expect(next.activities.some((item) => item.id === 'activity-games')).toBe(true);
  });

  it('PLAN-04 removes an attendee when they leave', () => {
    const state = readyState();
    const joined = appReducer(state, {
      type: 'join-activity',
      activityId: 'activity-sketch',
      userId: DEMO_USER_ID,
    });
    const next = appReducer(joined, {
      type: 'leave-activity',
      activityId: 'activity-sketch',
      userId: DEMO_USER_ID,
    });
    expect(next.activities.find((item) => item.id === 'activity-sketch')?.attendeeIds).not.toContain(
      DEMO_USER_ID,
    );
  });

  it('SAFE-01 removes a blocked profile and their hosted plans from local discovery state', () => {
    const state = readyState();
    const hostedIds = state.activities
      .filter((activity) => activity.hostId === 'profile-maya')
      .map((activity) => activity.id);
    expect(hostedIds.length).toBeGreaterThan(0);
    const next = appReducer(state, { type: 'block-profile', profileId: 'profile-maya' });
    expect(next.profiles.some((profile) => profile.id === 'profile-maya')).toBe(false);
    expect(next.activities.some((activity) => activity.hostId === 'profile-maya')).toBe(false);
    expect(
      next.invitations.some(
        (invitation) =>
          invitation.senderId === 'profile-maya' || invitation.receiverId === 'profile-maya',
      ),
    ).toBe(false);
    expect(next.savedActivityIds.some((id) => hostedIds.includes(id))).toBe(false);
  });

  it('US-05 records sent invitations on the activity', () => {
    const invitation: Invitation = {
      id: 'invite-new',
      activityId: 'activity-games',
      senderId: DEMO_USER_ID,
      receiverId: 'profile-maya',
      status: 'pending',
      message: 'Would you like to join?',
      createdAt: new Date().toISOString(),
    };
    const next = appReducer(readyState(), { type: 'send-invitations', invitations: [invitation] });
    expect(next.invitations[0]).toEqual(invitation);
    expect(next.activities.find((item) => item.id === 'activity-games')?.invitedIds).toContain(
      'profile-maya',
    );
  });

  it('US-06 adds an accepting invitee to attendees exactly once', () => {
    const state = readyState();
    const first = appReducer(state, {
      type: 'respond-invitation',
      invitationId: 'invite-walk-me',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });
    const second = appReducer(first, {
      type: 'respond-invitation',
      invitationId: 'invite-walk-me',
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });
    const attendees = second.activities.find((item) => item.id === 'activity-walk')!.attendeeIds;
    expect(attendees.filter((id) => id === DEMO_USER_ID)).toHaveLength(1);
  });

  it('US-06 does not add a declining invitee', () => {
    const next = appReducer(readyState(), {
      type: 'respond-invitation',
      invitationId: 'invite-walk-me',
      status: 'declined',
      respondedAt: new Date().toISOString(),
    });
    expect(next.activities.find((item) => item.id === 'activity-walk')?.attendeeIds).not.toContain(
      DEMO_USER_ID,
    );
  });

  it('US-07 joins a discoverable activity without duplicate attendance', () => {
    const first = appReducer(readyState(), {
      type: 'join-activity',
      activityId: 'activity-sketch',
      userId: DEMO_USER_ID,
    });
    const second = appReducer(first, {
      type: 'join-activity',
      activityId: 'activity-sketch',
      userId: DEMO_USER_ID,
    });
    const attendees = second.activities.find((item) => item.id === 'activity-sketch')!.attendeeIds;
    expect(attendees.filter((id) => id === DEMO_USER_ID)).toHaveLength(1);
  });

  it('US-08 saves and unsaves an activity', () => {
    const state = readyState();
    const saved = appReducer(state, { type: 'toggle-saved', activityId: 'activity-walk' });
    expect(saved.savedActivityIds).toContain('activity-walk');
    const unsaved = appReducer(saved, { type: 'toggle-saved', activityId: 'activity-walk' });
    expect(unsaved.savedActivityIds).not.toContain('activity-walk');
  });
});
