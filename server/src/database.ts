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
  activities: Collection<ActivityDocument>;
  invitations: Collection<InvitationDocument>;
  savedActivities: Collection<SavedActivityDocument>;
}

const client = new MongoClient(config.mongoUri, {
  appName: 'invite-someone-api',
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 8_000,
  ignoreUndefined: true,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let databasePromise: Promise<Db> | undefined;

const createIndexes = async (database: Db) => {
  const { members, activities, invitations, savedActivities } = collectionsFor(database);
  await Promise.all([
    members.createIndex({ emailNormalized: 1 }, { unique: true }),
    members.createIndex({ mapPoint: '2dsphere' }, { sparse: true }),
    members.createIndex({ 'profile.interests': 1 }),
    activities.createIndex({ startAt: 1 }),
    activities.createIndex({ hostId: 1, startAt: 1 }),
    invitations.createIndex({ activeKey: 1 }, { unique: true, sparse: true }),
    invitations.createIndex({ receiverId: 1, createdAt: -1 }),
    invitations.createIndex({ senderId: 1, createdAt: -1 }),
    savedActivities.createIndex({ userId: 1, activityId: 1 }, { unique: true }),
  ]);
};

const collectionsFor = (database: Db): Collections => ({
  members: database.collection<MemberDocument>('members'),
  activities: database.collection<ActivityDocument>('activities'),
  invitations: database.collection<InvitationDocument>('invitations'),
  savedActivities: database.collection<SavedActivityDocument>('saved_activities'),
});

export const getDatabase = async () => {
  databasePromise ??= (async () => {
    await client.connect();
    const database = client.db(config.databaseName);
    await database.command({ ping: 1 });
    await createIndexes(database);
    return database;
  })();
  return databasePromise;
};

export const getCollections = async () => collectionsFor(await getDatabase());
export const startSession = () => client.startSession();
export const closeDatabase = () => client.close();
