import { randomUUID } from 'node:crypto';

import { compare, hash } from 'bcryptjs';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { MongoServerError, type Filter } from 'mongodb';
import { z } from 'zod';

import {
  ACTIVITY_CATEGORIES,
  type Activity,
  type ActivityCategory,
  type AppData,
  type Invitation,
  type Profile,
} from '../../src/types/domain';
import { authenticatedUserId, issueAccessToken, requireAuthentication } from './auth';
import { config } from './config';
import {
  getCollections,
  getDatabase,
  startSession,
  type ActivityDocument,
  type GeoPoint,
  type InvitationDocument,
  type MemberDocument,
} from './database';

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const requiredText = (label: string, minimum = 2) =>
  z.string().trim().min(minimum, `${label} must be at least ${minimum} characters.`);
const httpsUrl = z
  .url('Enter a complete photo URL.')
  .max(500)
  .refine((value) => value.startsWith('https://'), 'Profile photos must use HTTPS.');

const registerSchema = z.object({
  name: requiredText('Name').max(80),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(128),
  city: requiredText('City').max(80),
  interests: z.array(z.enum(ACTIVITY_CATEGORIES)).min(2).max(ACTIVITY_CATEGORIES.length),
  availability: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
  connectionGoals: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
});

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1).max(128),
});

const profileUpdateSchema = z.object({
  name: requiredText('Name').max(80),
  avatarUrl: httpsUrl.nullable().optional(),
  headline: requiredText('Headline', 4).max(80),
  bio: requiredText('Bio', 20).max(320),
  city: requiredText('City').max(80),
  interests: z.array(z.enum(ACTIVITY_CATEGORIES)).min(2).max(ACTIVITY_CATEGORIES.length),
  availability: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
  connectionGoals: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
});

const activitySchema = z
  .object({
    title: requiredText('Title', 4).max(70),
    description: requiredText('Description', 20).max(500),
    category: z.enum(ACTIVITY_CATEGORIES),
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime().optional(),
    location: requiredText('Location', 3).max(160),
    city: requiredText('City').max(80),
    capacity: z.number().int().min(2).max(30),
    visibility: z.enum(['community', 'invite-only']),
    vibe: z.enum(['Easygoing', 'Active', 'Focused']),
  })
  .refine(
    (activity) =>
      !activity.endAt || new Date(activity.endAt).getTime() > new Date(activity.startAt).getTime(),
    { path: ['endAt'], message: 'The end time must be after the start time.' },
  );

const invitationBatchSchema = z.object({
  invitations: z
    .array(
      z.object({
        activityId: z.string().min(1).max(100),
        receiverId: z.string().min(1).max(100),
        message: z.string().trim().max(180),
      }),
    )
    .min(1)
    .max(30),
});

const invitationResponseSchema = z.object({
  status: z.enum(['accepted', 'declined', 'cancelled']),
});

const normalizeEmail = (email: string) => email.trim().toLocaleLowerCase();
const initialsFromName = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase();
const handleFromName = (name: string) =>
  name
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24) || `member${Date.now()}`;

const knownCityLocations: Record<string, { area: string; coordinates: [number, number] }> = {
  berlin: { area: 'Berlin (approximate)', coordinates: [13.405, 52.52] },
  potsdam: { area: 'Potsdam (approximate)', coordinates: [13.0645, 52.3906] },
};

const locationForCity = (city: string) => knownCityLocations[city.trim().toLocaleLowerCase()];
const mapPointForProfile = (profile: Profile): GeoPoint | undefined => {
  const coordinates = profile.approximateLocation?.coordinates;
  return coordinates ? { type: 'Point', coordinates } : undefined;
};

const publicProfile = (member: MemberDocument, viewerId: string): Profile => ({
  ...member.profile,
  email: member._id === viewerId ? member.email : undefined,
});

const activityFromDocument = (document: ActivityDocument): Activity => {
  const { _id: _mongoId, ...activity } = document;
  return activity;
};

const invitationFromDocument = (document: InvitationDocument): Invitation => {
  const { _id: _mongoId, activeKey: _activeKey, ...invitation } = document;
  return invitation;
};

const escapeRegularExpression = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createApp = () => {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '256kb' }));

  app.get('/health', async (_request, response) => {
    const database = await getDatabase();
    await database.command({ ping: 1 });
    response.json({ status: 'ok' });
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.nodeEnv === 'test' ? 10_000 : 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many sign-in attempts. Please wait and try again.' },
  });

  app.post('/v1/auth/register', authLimiter, async (request, response) => {
    const input = registerSchema.parse(request.body);
    const { members } = await getCollections();
    const userId = randomUUID();
    const now = new Date().toISOString();
    const email = normalizeEmail(input.email);
    const approximateLocation = locationForCity(input.city);
    const profile: Omit<Profile, 'email'> = {
      id: userId,
      name: input.name,
      handle: handleFromName(input.name),
      headline: 'Ready for a few good plans',
      bio: 'I joined Invite to meet kind people through small, comfortable activities.',
      city: input.city,
      initials: initialsFromName(input.name),
      avatarColor: '#315C4C',
      approximateLocation,
      interests: [...new Set(input.interests)],
      availability: [...new Set(input.availability)],
      connectionGoals: [...new Set(input.connectionGoals)],
      joinedAt: now,
      completedActivities: 0,
      reliabilityScore: 100,
      isVerified: false,
    };
    const profileMapPoint = mapPointForProfile(profile);
    const member: MemberDocument = {
      _id: userId,
      email,
      emailNormalized: email,
      passwordHash: await hash(input.password, 12),
      profile,
      ...(profileMapPoint ? { mapPoint: profileMapPoint } : {}),
      createdAt: now,
      updatedAt: now,
    };

    try {
      await members.insertOne(member);
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new HttpError(409, 'An account with this email already exists.');
      }
      throw error;
    }

    response.status(201).json({ userId, token: await issueAccessToken(userId) });
  });

  app.post('/v1/auth/login', authLimiter, async (request, response) => {
    const input = loginSchema.parse(request.body);
    const { members } = await getCollections();
    const member = await members.findOne({ emailNormalized: normalizeEmail(input.email) });
    if (!member || !(await compare(input.password, member.passwordHash))) {
      throw new HttpError(401, 'The email or password is incorrect.');
    }
    response.json({ userId: member._id, token: await issueAccessToken(member._id) });
  });

  app.use('/v1', requireAuthentication);

  app.get('/v1/session', (_request, response) => {
    response.json({ userId: authenticatedUserId(response) });
  });

  app.get('/v1/data', async (_request, response) => {
    const userId = authenticatedUserId(response);
    const { members, activities, invitations, savedActivities } = await getCollections();
    const [memberDocuments, invitationDocuments, savedDocuments] = await Promise.all([
      members.find({}).sort({ 'profile.name': 1 }).toArray(),
      invitations
        .find({ $or: [{ senderId: userId }, { receiverId: userId }] })
        .sort({ createdAt: -1 })
        .toArray(),
      savedActivities.find({ userId }).toArray(),
    ]);
    const invitedActivityIds = invitationDocuments
      .filter((invitation) => invitation.receiverId === userId && invitation.status !== 'cancelled')
      .map((invitation) => invitation.activityId);
    const activityDocuments = await activities
      .find({
        $or: [
          { visibility: 'community' },
          { hostId: userId },
          { attendeeIds: userId },
          { _id: { $in: invitedActivityIds } },
        ],
      })
      .sort({ startAt: 1 })
      .toArray();

    const visibleInvitations = invitationDocuments.map(invitationFromDocument);
    const data: AppData = {
      profiles: memberDocuments.map((member) => publicProfile(member, userId)),
      activities: activityDocuments.map((document) => {
        const activity = activityFromDocument(document);
        return {
          ...activity,
          invitedIds: [
            ...new Set(
              visibleInvitations
                .filter(
                  (invitation) =>
                    invitation.activityId === activity.id && invitation.status !== 'cancelled',
                )
                .map((invitation) => invitation.receiverId),
            ),
          ],
        };
      }),
      invitations: visibleInvitations,
      savedActivityIds: savedDocuments.map((saved) => saved.activityId),
    };
    response.json(data);
  });

  app.get('/v1/profiles', async (request, response) => {
    const userId = authenticatedUserId(response);
    const { members } = await getCollections();
    const current = await members.findOne({ _id: userId });
    if (!current) throw new HttpError(404, 'Your profile could not be found.');

    const filter: Filter<MemberDocument> = { _id: { $ne: userId } };
    const query = typeof request.query.query === 'string' ? request.query.query.trim() : '';
    if (query) {
      const search = new RegExp(escapeRegularExpression(query), 'i');
      filter.$or = [
        { 'profile.name': search },
        { 'profile.handle': search },
        { 'profile.headline': search },
        { 'profile.bio': search },
        { 'profile.city': search },
        { 'profile.approximateLocation.area': search },
      ];
    }

    const interests =
      typeof request.query.interests === 'string'
        ? request.query.interests
            .split(',')
            .filter((value): value is ActivityCategory =>
              ACTIVITY_CATEGORIES.includes(value as ActivityCategory),
            )
        : [];
    if (interests.length > 0) filter['profile.interests'] = { $in: interests };
    if (typeof request.query.availability === 'string' && request.query.availability) {
      filter['profile.availability'] = request.query.availability;
    }
    if (typeof request.query.connectionGoal === 'string' && request.query.connectionGoal) {
      filter['profile.connectionGoals'] = request.query.connectionGoal;
    }
    if (request.query.verifiedOnly === 'true') filter['profile.isVerified'] = true;

    const maxDistanceKm = Number(request.query.maxDistanceKm);
    if (Number.isFinite(maxDistanceKm) && maxDistanceKm > 0 && current.mapPoint) {
      filter.mapPoint = {
        $near: {
          $geometry: current.mapPoint,
          $maxDistance: Math.min(maxDistanceKm, 100) * 1000,
        },
      };
    }

    const results = await members.find(filter).limit(100).toArray();
    response.json(results.map((member) => publicProfile(member, userId)));
  });

  app.put('/v1/profile', async (request, response) => {
    const userId = authenticatedUserId(response);
    const input = profileUpdateSchema.parse(request.body);
    const { members } = await getCollections();
    const existing = await members.findOne({ _id: userId });
    if (!existing) throw new HttpError(404, 'Your profile could not be found.');

    const cityChanged =
      existing.profile.city.toLocaleLowerCase() !== input.city.toLocaleLowerCase();
    const { avatarUrl, ...publicInput } = input;
    const profile: Omit<Profile, 'email'> = {
      ...existing.profile,
      ...publicInput,
      avatarUrl: avatarUrl === null ? undefined : (avatarUrl ?? existing.profile.avatarUrl),
      initials: initialsFromName(input.name),
      approximateLocation: cityChanged
        ? locationForCity(input.city)
        : existing.profile.approximateLocation,
    };
    const mapPoint = mapPointForProfile(profile);
    await members.updateOne(
      { _id: userId },
      {
        $set: {
          profile,
          updatedAt: new Date().toISOString(),
          ...(mapPoint ? { mapPoint } : {}),
        },
        ...(!mapPoint ? { $unset: { mapPoint: '' } } : {}),
      },
    );
    response.json({ ...profile, email: existing.email });
  });

  app.post('/v1/activities', async (request, response) => {
    const userId = authenticatedUserId(response);
    const input = activitySchema.parse(request.body);
    if (new Date(input.startAt).getTime() <= Date.now()) {
      throw new HttpError(400, 'Choose a time in the future.');
    }
    const { activities, members } = await getCollections();
    if (!(await members.findOne({ _id: userId }, { projection: { _id: 1 } }))) {
      throw new HttpError(404, 'Your profile could not be found.');
    }

    const id = randomUUID();
    const activity: ActivityDocument = {
      _id: id,
      id,
      ...input,
      hostId: userId,
      attendeeIds: [userId],
      invitedIds: [],
      createdAt: new Date().toISOString(),
    };
    await activities.insertOne(activity);
    response.status(201).json(activityFromDocument(activity));
  });

  app.post('/v1/invitations', async (request, response) => {
    const userId = authenticatedUserId(response);
    const input = invitationBatchSchema.parse(request.body);
    const activityIds = [...new Set(input.invitations.map((invitation) => invitation.activityId))];
    if (activityIds.length !== 1) throw new HttpError(400, 'Invite people to one plan at a time.');

    const { activities, invitations, members } = await getCollections();
    const activity = await activities.findOne({ _id: activityIds[0] });
    if (!activity) throw new HttpError(404, 'The activity could not be found.');
    if (activity.hostId !== userId) throw new HttpError(403, 'Only the host can invite people.');
    if (new Date(activity.startAt).getTime() <= Date.now()) {
      throw new HttpError(409, 'Invitations cannot be sent for a past activity.');
    }
    if (activity.attendeeIds.length >= activity.capacity) {
      throw new HttpError(409, 'This activity is already full.');
    }

    const uniqueInputs = [
      ...new Map(
        input.invitations.map((invitation) => [invitation.receiverId, invitation]),
      ).values(),
    ].filter((invitation) => invitation.receiverId !== userId);
    const receiverIds = uniqueInputs.map((invitation) => invitation.receiverId);
    if (receiverIds.length === 0) throw new HttpError(400, 'Choose at least one other person.');
    if (receiverIds.some((receiverId) => activity.attendeeIds.includes(receiverId))) {
      throw new HttpError(409, 'Someone selected is already attending this activity.');
    }
    const receiverCount = await members.countDocuments({ _id: { $in: receiverIds } });
    if (receiverCount !== receiverIds.length) {
      throw new HttpError(400, 'One or more selected profiles no longer exist.');
    }

    const activeKeys = uniqueInputs.map(
      (invitation) => `${invitation.activityId}:${invitation.receiverId}`,
    );
    const existing = await invitations.find({ activeKey: { $in: activeKeys } }).toArray();
    const existingKeys = new Set(existing.map((invitation) => invitation.activeKey));
    const createdAt = new Date().toISOString();
    const documents: InvitationDocument[] = uniqueInputs
      .filter(
        (invitation) => !existingKeys.has(`${invitation.activityId}:${invitation.receiverId}`),
      )
      .map((invitation) => {
        const id = randomUUID();
        return {
          _id: id,
          id,
          activityId: invitation.activityId,
          senderId: userId,
          receiverId: invitation.receiverId,
          status: 'pending',
          message: invitation.message,
          createdAt,
          activeKey: `${invitation.activityId}:${invitation.receiverId}`,
        };
      });

    if (documents.length === 0) {
      response.json([]);
      return;
    }
    try {
      await invitations.insertMany(documents, { ordered: true });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new HttpError(409, 'One of these people has already been invited.');
      }
      throw error;
    }
    response.status(201).json(documents.map(invitationFromDocument));
  });

  app.patch('/v1/invitations/:invitationId', async (request, response) => {
    const userId = authenticatedUserId(response);
    const { status } = invitationResponseSchema.parse(request.body);
    const { activities, invitations } = await getCollections();
    const invitation = await invitations.findOne({ _id: request.params.invitationId });
    if (!invitation) throw new HttpError(404, 'The invitation could not be found.');
    if (invitation.status !== 'pending') {
      throw new HttpError(409, 'This invitation has already been answered.');
    }

    if (status === 'cancelled') {
      if (invitation.senderId !== userId) {
        throw new HttpError(403, 'Only the sender can cancel this invitation.');
      }
      await invitations.updateOne(
        { _id: invitation._id, status: 'pending' },
        {
          $set: { status, respondedAt: new Date().toISOString() },
          $unset: { activeKey: '' },
        },
      );
      response.status(204).end();
      return;
    }

    if (invitation.receiverId !== userId) {
      throw new HttpError(403, 'Only the invited person can answer this invitation.');
    }
    const respondedAt = new Date().toISOString();
    if (status === 'declined') {
      await invitations.updateOne(
        { _id: invitation._id, status: 'pending' },
        { $set: { status, respondedAt } },
      );
      response.status(204).end();
      return;
    }

    const session = startSession();
    try {
      await session.withTransaction(async () => {
        const freshInvitation = await invitations.findOne(
          { _id: invitation._id, status: 'pending', receiverId: userId },
          { session },
        );
        if (!freshInvitation) throw new HttpError(409, 'This invitation was already answered.');

        const activity = await activities.findOne({ _id: invitation.activityId }, { session });
        if (!activity) throw new HttpError(404, 'The activity could not be found.');
        if (!activity.attendeeIds.includes(userId)) {
          const joined = await activities.updateOne(
            {
              _id: activity._id,
              attendeeIds: { $ne: userId },
              $expr: { $lt: [{ $size: '$attendeeIds' }, '$capacity'] },
            },
            { $addToSet: { attendeeIds: userId } },
            { session },
          );
          if (joined.modifiedCount !== 1) throw new HttpError(409, 'This activity is full.');
        }

        const answered = await invitations.updateOne(
          { _id: invitation._id, status: 'pending' },
          { $set: { status: 'accepted', respondedAt } },
          { session },
        );
        if (answered.modifiedCount !== 1) {
          throw new HttpError(409, 'This invitation was already answered.');
        }
      });
    } finally {
      await session.endSession();
    }
    response.status(204).end();
  });

  app.put('/v1/activities/:activityId/attendees/me', async (request, response) => {
    const userId = authenticatedUserId(response);
    const { activities } = await getCollections();
    const activity = await activities.findOne({ _id: request.params.activityId });
    if (!activity) throw new HttpError(404, 'The activity could not be found.');
    if (activity.attendeeIds.includes(userId)) {
      response.status(204).end();
      return;
    }
    if (activity.visibility !== 'community') {
      throw new HttpError(403, 'This activity is invite-only.');
    }
    if (new Date(activity.startAt).getTime() <= Date.now()) {
      throw new HttpError(409, 'This activity has already started.');
    }

    const joined = await activities.updateOne(
      {
        _id: activity._id,
        visibility: 'community',
        attendeeIds: { $ne: userId },
        $expr: { $lt: [{ $size: '$attendeeIds' }, '$capacity'] },
      },
      { $addToSet: { attendeeIds: userId } },
    );
    if (joined.modifiedCount !== 1) throw new HttpError(409, 'This activity is full.');
    response.status(204).end();
  });

  app.put('/v1/saved-activities/:activityId', async (request, response) => {
    const userId = authenticatedUserId(response);
    const activityId = request.params.activityId;
    const { activities, invitations, savedActivities } = await getCollections();
    const activity = await activities.findOne({ _id: activityId });
    if (!activity) {
      throw new HttpError(404, 'The activity could not be found.');
    }
    const invited = await invitations.findOne({
      activityId,
      receiverId: userId,
      status: { $ne: 'cancelled' },
    });
    const canSeeActivity =
      activity.visibility === 'community' ||
      activity.hostId === userId ||
      activity.attendeeIds.includes(userId) ||
      Boolean(invited);
    if (!canSeeActivity) throw new HttpError(403, 'You cannot access this activity.');
    await savedActivities.updateOne(
      { userId, activityId },
      {
        $setOnInsert: {
          _id: `${userId}:${activityId}`,
          userId,
          activityId,
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    );
    response.status(204).end();
  });

  app.delete('/v1/saved-activities/:activityId', async (request, response) => {
    const userId = authenticatedUserId(response);
    const { savedActivities } = await getCollections();
    await savedActivities.deleteOne({ userId, activityId: request.params.activityId });
    response.status(204).end();
  });

  app.use((_request, response) => {
    response.status(404).json({ message: 'Route not found.' });
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      response.status(error.status).json({ message: error.message });
      return;
    }
    if (error instanceof z.ZodError) {
      response.status(400).json({ message: error.issues[0]?.message ?? 'Check the request.' });
      return;
    }
    if (error instanceof SyntaxError) {
      response.status(400).json({ message: 'The request body is not valid JSON.' });
      return;
    }
    console.error(error);
    response.status(500).json({ message: 'The server could not complete that request.' });
  });

  return app;
};
