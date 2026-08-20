import { randomUUID } from 'node:crypto';

import { hash } from 'bcryptjs';

import { seedActivities, seedInvitations, seedProfiles } from '../../src/data/seed';
import { closeDatabase, getCollections, type MemberDocument } from './database';

const seed = async () => {
  const { members, activities, invitations, savedActivities } = await getCollections();
  const counts = await Promise.all([
    members.countDocuments(),
    activities.countDocuments(),
    invitations.countDocuments(),
    savedActivities.countDocuments(),
  ]);
  if (counts.some((count) => count > 0)) {
    throw new Error('Seed stopped because the database is not empty. No data was changed.');
  }

  const demoPasswordHash = await hash('invite-demo', 12);
  const otherPasswordHash = await hash(randomUUID(), 12);
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
      passwordHash: sourceEmail ? demoPasswordHash : otherPasswordHash,
      profile,
      ...(mapPoint ? { mapPoint } : {}),
      createdAt: now,
      updatedAt: now,
    };
  });

  await members.insertMany(memberDocuments);
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
  console.log('Seeded Invite demo data. Sign in with demo@invite.app / invite-demo.');
};

seed()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
