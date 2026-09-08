import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, beforeEach, describe, it } from 'node:test';

import { createApp } from '../app';
import { issueAccessToken } from '../auth';
import { closeDatabase, getCollections } from '../database';
import { resetE2EFixtures } from '../e2e-fixtures';

describe('MongoDB-backed Invite API', () => {
  let server: Server;
  let baseUrl: string;
  const tokens: Record<string, string> = {};

  const request = async (path: string, options: RequestInit = {}, userId?: string) =>
    fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(userId ? { authorization: `Bearer ${tokens[userId]}` } : {}),
        ...options.headers,
      },
    });

  before(async () => {
    for (const userId of ['profile-me', 'profile-maya', 'profile-jonas', 'profile-sofia']) {
      tokens[userId] = await issueAccessToken(userId);
    }
    server = createApp().listen(0);
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test API did not bind to TCP.');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(async () => resetE2EFixtures());

  after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await closeDatabase();
  });

  it('rejects missing and malformed authentication', async () => {
    assert.equal((await request('/v1/data')).status, 401);
    assert.equal(
      (
        await request('/v1/data', {
          headers: { authorization: 'Bearer not-a-valid-token' },
        })
      ).status,
      401,
    );
  });

  it('authenticates the fixture account and keeps private email fields scoped', async () => {
    const login = await request('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'demo@invite.app', password: 'invite-demo' }),
    });
    assert.equal(login.status, 200);
    const session = (await login.json()) as { token: string; userId: string };
    assert.equal(session.userId, 'profile-me');

    const response = await fetch(`${baseUrl}/v1/data`, {
      headers: { authorization: `Bearer ${session.token}` },
    });
    assert.equal(response.status, 200);
    const data = (await response.json()) as { profiles: { email?: string; id: string }[] };
    assert.equal(
      data.profiles.find((profile) => profile.id === 'profile-me')?.email,
      'demo@invite.app',
    );
    assert.ok(
      data.profiles
        .filter((profile) => profile.id !== 'profile-me')
        .every((profile) => !profile.email),
    );
  });

  it('does not disclose invite-only activities to unrelated members', async () => {
    const invited = (await (await request('/v1/data', {}, 'profile-me')).json()) as {
      activities: { id: string }[];
    };
    const unrelated = (await (await request('/v1/data', {}, 'profile-jonas')).json()) as {
      activities: { id: string }[];
    };
    assert.ok(invited.activities.some((activity) => activity.id === 'activity-dumplings'));
    assert.ok(!unrelated.activities.some((activity) => activity.id === 'activity-dumplings'));
  });

  it('enforces host and receiver invitation permissions', async () => {
    const unauthorizedInvite = await request(
      '/v1/invitations',
      {
        method: 'POST',
        body: JSON.stringify({
          invitations: [
            { activityId: 'activity-walk', receiverId: 'profile-sofia', message: 'Join us?' },
          ],
        }),
      },
      'profile-me',
    );
    assert.equal(unauthorizedInvite.status, 403);

    const unauthorizedDecision = await request(
      '/v1/invitations/invite-walk-me',
      { method: 'PATCH', body: JSON.stringify({ status: 'accepted' }) },
      'profile-jonas',
    );
    assert.equal(unauthorizedDecision.status, 403);
  });

  it('accepts an invitation transactionally and only once', async () => {
    const responses = await Promise.all([
      request(
        '/v1/invitations/invite-walk-me',
        { method: 'PATCH', body: JSON.stringify({ status: 'accepted' }) },
        'profile-me',
      ),
      request(
        '/v1/invitations/invite-walk-me',
        { method: 'PATCH', body: JSON.stringify({ status: 'accepted' }) },
        'profile-me',
      ),
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [204, 409]);

    const { activities, invitations } = await getCollections();
    const activity = await activities.findOne({ _id: 'activity-walk' });
    const invitation = await invitations.findOne({ _id: 'invite-walk-me' });
    assert.equal(activity?.attendeeIds.filter((id) => id === 'profile-me').length, 1);
    assert.equal(invitation?.status, 'accepted');
  });

  it('enforces community capacity under concurrent joins', async () => {
    const { activities } = await getCollections();
    await activities.updateOne(
      { _id: 'activity-run' },
      { $set: { capacity: 3, attendeeIds: ['profile-luis', 'profile-jonas'] } },
    );
    const responses = await Promise.all([
      request('/v1/activities/activity-run/attendees/me', { method: 'PUT' }, 'profile-sofia'),
      request('/v1/activities/activity-run/attendees/me', { method: 'PUT' }, 'profile-maya'),
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [204, 409]);
    assert.equal((await activities.findOne({ _id: 'activity-run' }))?.attendeeIds.length, 3);
  });

  it('keeps saved activities private to the authenticated member', async () => {
    assert.equal(
      (await request('/v1/saved-activities/activity-run', { method: 'PUT' }, 'profile-me')).status,
      204,
    );
    const mine = (await (await request('/v1/data', {}, 'profile-me')).json()) as {
      savedActivityIds: string[];
    };
    const theirs = (await (await request('/v1/data', {}, 'profile-maya')).json()) as {
      savedActivityIds: string[];
    };
    assert.ok(mine.savedActivityIds.includes('activity-run'));
    assert.ok(!theirs.savedActivityIds.includes('activity-run'));
  });
});
