import { randomUUID, timingSafeEqual } from 'node:crypto';

import { hash } from 'bcryptjs';

import { seedActivities, seedInvitations, seedProfiles } from '../../src/data/seed';
import {
  ensureDatabaseIndexes,
  getCollections,
  type MemberDocument,
  type UserIdentityDocument,
} from './database';

export interface E2EFixtureSafetyInput {
  databaseName: string;
  enabled: boolean;
  token?: string;
}

export interface FirebaseFixtureIdentity {
  email: string;
  emailVerified: boolean;
  providerSubject: string;
  userId: string;
}

export const E2E_FIXTURE_IDS = {
  members: seedProfiles.map((profile) => profile.id),
  activities: seedActivities.map((activity) => activity.id),
  invitations: seedInvitations.map((invitation) => invitation.id),
} as const;

export const assertSafeE2EFixtureConfig = ({
  databaseName,
  enabled,
  token,
}: E2EFixtureSafetyInput) => {
  if (!enabled) throw new Error('E2E fixtures are disabled.');
  if (!/(^|[_-])(e2e|test)([_-]|$)/i.test(databaseName)) {
    throw new Error('E2E fixtures require an isolated e2e or test database name.');
  }
  if (!token || token.length < 32) {
    throw new Error('E2E fixtures require a token of at least 32 characters.');
  }
};

export const isE2EFixtureTokenValid = (expected: string, supplied?: string) => {
  if (!supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return (
    expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes)
  );
};

export const resetE2EFixtures = async (firebaseIdentities: FirebaseFixtureIdentity[] = []) => {
  await ensureDatabaseIndexes();
  const { members, userIdentities, activities, invitations, savedActivities } =
    await getCollections();
  const demoPasswordHash = await hash('invite-demo', 12);
  const unusablePasswordHash = await hash(randomUUID(), 12);
  const now = new Date().toISOString();
  const memberDocuments: MemberDocument[] = seedProfiles.map((source) => {
    const { email: sourceEmail, ...profile } = source;
    const email = sourceEmail ?? `${profile.handle}@seed.invite.invalid`;
    const mapPoint = profile.approximateLocation
      ? { type: 'Point' as const, coordinates: profile.approximateLocation.coordinates }
      : undefined;
    return {
      _id: profile.id,
      email,
      emailNormalized: email.toLocaleLowerCase(),
      passwordHash: sourceEmail ? demoPasswordHash : unusablePasswordHash,
      profile,
      ...(mapPoint ? { mapPoint } : {}),
      createdAt: now,
      updatedAt: now,
    };
  });
  const knownMemberIds = new Set(memberDocuments.map((member) => member._id));
  const identityDocuments: UserIdentityDocument[] = firebaseIdentities.map((identity) => {
    if (!knownMemberIds.has(identity.userId)) {
      throw new Error(`Firebase fixture identity references unknown member ${identity.userId}.`);
    }
    return {
      _id: `firebase:${identity.providerSubject}`,
      userId: identity.userId,
      provider: 'firebase',
      providerSubject: identity.providerSubject,
      email: identity.email.trim().toLocaleLowerCase(),
      emailVerified: identity.emailVerified,
      createdAt: now,
      updatedAt: now,
    };
  });

  await Promise.all([
    savedActivities.deleteMany({}),
    invitations.deleteMany({}),
    activities.deleteMany({}),
    userIdentities.deleteMany({}),
    members.deleteMany({}),
  ]);
  await members.insertMany(memberDocuments);
  if (identityDocuments.length > 0) await userIdentities.insertMany(identityDocuments);
  await activities.insertMany(
    seedActivities.map((activity) => ({ ...activity, _id: activity.id })),
  );
  await invitations.insertMany(
    seedInvitations.map((invitation) => ({
      ...invitation,
      _id: invitation.id,
      activeKey:
        invitation.status === 'cancelled'
          ? undefined
          : `${invitation.activityId}:${invitation.receiverId}`,
    })),
  );
  await savedActivities.insertOne({
    _id: 'profile-me:activity-sketch',
    userId: 'profile-me',
    activityId: 'activity-sketch',
    createdAt: now,
  });

  return {
    resetAt: now,
    counts: {
      members: memberDocuments.length,
      identities: identityDocuments.length,
      activities: seedActivities.length,
      invitations: seedInvitations.length,
      savedActivities: 1,
    },
    fixtures: E2E_FIXTURE_IDS,
  };
};
