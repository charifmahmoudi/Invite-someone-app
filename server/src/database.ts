import { MongoClient, ServerApiVersion, type Collection, type Db, type Document } from 'mongodb';

import type { Activity, Invitation, Profile } from '../../src/types/domain';
import { config } from './config';

export interface GeoPoint {
  type: 'Point';
  coordinates: [longitude: number, latitude: number];
}

export interface MemberDocument extends Document {
  _id: string;
  email: string;
  emailNormalized: string;
  passwordHash: string;
  profile: Omit<Profile, 'email'>;
  mapPoint?: GeoPoint;
  createdAt: string;
  updatedAt: string;
}

export interface UserIdentityDocument extends Document {
  _id: string;
  userId: string;
  provider: 'clerk';
  providerSubject: string;
  email?: string;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityDocument extends Activity, Document {
  _id: string;
}

export interface InvitationDocument extends Invitation, Document {
  _id: string;
  activeKey?: string;
}

export interface SavedActivityDocument extends Document {
  _id: string;
  userId: string;
  activityId: string;
  createdAt: string;
}

export interface Collections {
  members: Collection<MemberDocument>;
  userIdentities: Collection<UserIdentityDocument>;
  activities: Collection<ActivityDocument>;
  invitations: Collection<InvitationDocument>;
  savedActivities: Collection<SavedActivityDocument>;
}

const client = new MongoClient(config.mongoUri, {
  appName: 'invite-someone-api',
  maxPoolSize: config.mongoMaxPoolSize,
  minPoolSize: 0,
  maxIdleTimeMS: config.mongoMaxIdleTimeMs,
  serverSelectionTimeoutMS: 8_000,
  ignoreUndefined: true,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let databasePromise: Promise<Db> | undefined;

const collectionsFor = (database: Db): Collections => ({
  members: database.collection<MemberDocument>('members'),
  userIdentities: database.collection<UserIdentityDocument>('user_identities'),
  activities: database.collection<ActivityDocument>('activities'),
  invitations: database.collection<InvitationDocument>('invitations'),
  savedActivities: database.collection<SavedActivityDocument>('saved_activities'),
});

/**
 * Lazily establishes MongoDB access. Application startup intentionally does not
 * ping the database or maintain indexes so scale-to-zero cold starts remain small.
 */
export const getDatabase = async () => {
  databasePromise ??= (async () => {
    await client.connect();
    return client.db(config.databaseName);
  })();
  return databasePromise;
};

export const pingDatabase = async () => {
  const database = await getDatabase();
  await database.command({ ping: 1 });
};

/**
 * Explicit deployment/maintenance operation. Run this from `npm run server:indexes`
 * or before seeding a new environment, not during every API cold start.
 */
export const ensureDatabaseIndexes = async () => {
  const database = await getDatabase();
  const { members, userIdentities, activities, invitations, savedActivities } =
    collectionsFor(database);

  await Promise.all([
    members.createIndex({ emailNormalized: 1 }, { unique: true }),
    members.createIndex({ mapPoint: '2dsphere' }, { sparse: true }),
    members.createIndex({ 'profile.interests': 1 }),
    userIdentities.createIndex(
      { provider: 1, providerSubject: 1 },
      { unique: true, name: 'identity_provider_subject_unique' },
    ),
    userIdentities.createIndex({ userId: 1 }, { name: 'identity_user' }),
    activities.createIndex({ startAt: 1 }),
    activities.createIndex({ hostId: 1, startAt: 1 }),
    invitations.createIndex({ activeKey: 1 }, { unique: true, sparse: true }),
    invitations.createIndex({ receiverId: 1, createdAt: -1 }),
    invitations.createIndex({ senderId: 1, createdAt: -1 }),
    savedActivities.createIndex({ userId: 1, activityId: 1 }, { unique: true }),
  ]);
};

export const getCollections = async () => collectionsFor(await getDatabase());
export const startSession = () => client.startSession();
export const closeDatabase = async () => {
  databasePromise = undefined;
  await client.close();
};
