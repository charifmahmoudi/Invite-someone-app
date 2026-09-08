import { Router } from 'express';
import type { Filter } from 'mongodb';

import {
  ACTIVITY_CATEGORIES,
  type Activity,
  type ActivityCategory,
  type AppData,
  type Invitation,
  type Profile,
} from '../../src/types/domain';
import { authenticatedUserId } from './auth';
import {
  getCollections,
  type ActivityDocument,
  type InvitationDocument,
  type MemberDocument,
} from './database';

interface Page<T> {
  items: T[];
  nextCursor?: string;
}

const pageLimit = (value: unknown) => {
  const parsed = typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), 50) : 20;
};

const encodeCursor = (value: Record<string, string>) =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

const decodeCursor = <T extends Record<string, string>>(value: unknown): T | undefined => {
  if (typeof value !== 'string' || !value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as T) : undefined;
  } catch {
    return undefined;
  }
};

const escapeRegularExpression = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

const blockedPeerIdsFor = async (userId: string) => {
  const { userBlocks } = await getCollections();
  const documents = await userBlocks
    .find({
      $or: [{ blockerId: userId }, { blockedId: userId }],
    })
    .toArray();
  return [
    ...new Set(
      documents.map((block) => (block.blockerId === userId ? block.blockedId : block.blockerId)),
    ),
  ];
};

const visibleActivityFilter = (
  userId: string,
  blockedIds: string[],
  invitedActivityIds: string[],
): Filter<ActivityDocument> => ({
  $and: [
    { hostId: { $nin: blockedIds } },
    {
      $or: [
        { status: { $ne: 'cancelled' } },
        { hostId: userId },
        { attendeeIds: userId },
      ],
    },
    {
      $or: [
        { visibility: 'community' },
        { hostId: userId },
        { attendeeIds: userId },
        { _id: { $in: invitedActivityIds } },
      ],
    },
  ],
});

export const resourceRouter = Router();

resourceRouter.get('/data', async (_request, response) => {
  const userId = authenticatedUserId(response);
  const blockedIds = await blockedPeerIdsFor(userId);
  const { members, activities, invitations, savedActivities } = await getCollections();

  const rawInvitations = await invitations
    .find({ $or: [{ senderId: userId }, { receiverId: userId }] })
    .sort({ createdAt: -1 })
    .toArray();
  const invitationDocuments = rawInvitations.filter(
    (invitation) =>
      !blockedIds.includes(invitation.senderId) && !blockedIds.includes(invitation.receiverId),
  );
  const invitedActivityIds = invitationDocuments
    .filter((invitation) => invitation.receiverId === userId && invitation.status !== 'cancelled')
    .map((invitation) => invitation.activityId);

  const [memberDocuments, activityDocuments, savedDocuments] = await Promise.all([
    members.find({ _id: { $nin: blockedIds } }).sort({ 'profile.name': 1 }).toArray(),
    activities
      .find(visibleActivityFilter(userId, blockedIds, invitedActivityIds))
      .sort({ startAt: 1 })
      .toArray(),
    savedActivities.find({ userId }).toArray(),
  ]);

  const visibleInvitations = invitationDocuments.map(invitationFromDocument);
  const visibleActivityIds = new Set(activityDocuments.map((activity) => activity._id));
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
    savedActivityIds: savedDocuments
      .map((saved) => saved.activityId)
      .filter((activityId) => visibleActivityIds.has(activityId)),
  };
  response.json(data);
});

resourceRouter.get('/me', async (_request, response) => {
  const userId = authenticatedUserId(response);
  const { members } = await getCollections();
  const member = await members.findOne({ _id: userId });
  if (!member) {
    response.status(404).json({ message: 'Your profile could not be found.' });
    return;
  }
  response.json(publicProfile(member, userId));
});

resourceRouter.get('/activities', async (request, response) => {
  const userId = authenticatedUserId(response);
  const blockedIds = await blockedPeerIdsFor(userId);
  const limit = pageLimit(request.query.limit);
  const cursor = decodeCursor<{ startAt: string; id: string }>(request.query.cursor);
  const { activities, invitations } = await getCollections();

  const invitedActivityIds = await invitations.distinct('activityId', {
    receiverId: userId,
    senderId: { $nin: blockedIds },
    status: { $ne: 'cancelled' },
  });
  const visibility = visibleActivityFilter(userId, blockedIds, invitedActivityIds);
  const filter: Filter<ActivityDocument> = cursor
    ? {
        $and: [
          visibility,
          {
            $or: [
              { startAt: { $gt: cursor.startAt } },
              { startAt: cursor.startAt, _id: { $gt: cursor.id } },
            ],
          },
        ],
      }
    : visibility;

  const documents = await activities
    .find(filter)
    .sort({ startAt: 1, _id: 1 })
    .limit(limit + 1)
    .toArray();
  const pageDocuments = documents.slice(0, limit);
  const activityIds = pageDocuments.map((activity) => activity._id);
  const visibleInvitations = activityIds.length
    ? await invitations
        .find({
          activityId: { $in: activityIds },
          senderId: { $nin: blockedIds },
          receiverId: { $nin: blockedIds },
          $or: [{ senderId: userId }, { receiverId: userId }],
        })
        .toArray()
    : [];

  const items = pageDocuments.map((document) => {
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
  });
  const last = pageDocuments.at(-1);
  const page: Page<Activity> = {
    items,
    ...(documents.length > limit && last
      ? { nextCursor: encodeCursor({ startAt: last.startAt, id: last._id }) }
      : {}),
  };
  response.json(page);
});

resourceRouter.get('/people', async (request, response) => {
  const userId = authenticatedUserId(response);
  const blockedIds = await blockedPeerIdsFor(userId);
  const limit = pageLimit(request.query.limit);
  const cursor = decodeCursor<{ name: string; id: string }>(request.query.cursor);
  const { members } = await getCollections();
  const current = await members.findOne({ _id: userId });
  if (!current) {
    response.status(404).json({ message: 'Your profile could not be found.' });
    return;
  }

  const clauses: Filter<MemberDocument>[] = [
    { _id: { $ne: userId } },
    { _id: { $nin: blockedIds } },
  ];
  const query = typeof request.query.query === 'string' ? request.query.query.trim() : '';
  if (query) {
    const search = new RegExp(escapeRegularExpression(query), 'i');
    clauses.push({
      $or: [
        { 'profile.name': search },
        { 'profile.handle': search },
        { 'profile.headline': search },
        { 'profile.bio': search },
        { 'profile.city': search },
        { 'profile.approximateLocation.area': search },
      ],
    });
  }

  const interests =
    typeof request.query.interests === 'string'
      ? request.query.interests
          .split(',')
          .filter((value): value is ActivityCategory =>
            ACTIVITY_CATEGORIES.includes(value as ActivityCategory),
          )
      : [];
  if (interests.length) clauses.push({ 'profile.interests': { $in: interests } });
  if (typeof request.query.availability === 'string' && request.query.availability) {
    clauses.push({ 'profile.availability': request.query.availability });
  }
  if (typeof request.query.connectionGoal === 'string' && request.query.connectionGoal) {
    clauses.push({ 'profile.connectionGoals': request.query.connectionGoal });
  }
  if (request.query.verifiedOnly === 'true') clauses.push({ 'profile.isVerified': true });
  if (cursor) {
    clauses.push({
      $or: [
        { 'profile.name': { $gt: cursor.name } },
        { 'profile.name': cursor.name, _id: { $gt: cursor.id } },
      ],
    });
  }

  const documents = await members
    .find({ $and: clauses })
    .sort({ 'profile.name': 1, _id: 1 })
    .limit(limit + 1)
    .toArray();
  const pageDocuments = documents.slice(0, limit);
  const last = pageDocuments.at(-1);
  const page: Page<Profile> = {
    items: pageDocuments.map((member) => publicProfile(member, userId)),
    ...(documents.length > limit && last
      ? { nextCursor: encodeCursor({ name: last.profile.name, id: last._id }) }
      : {}),
  };
  response.json(page);
});

// Compatibility non-paginated profile search, now with the same block semantics.
resourceRouter.get('/profiles', async (request, response) => {
  const userId = authenticatedUserId(response);
  const blockedIds = await blockedPeerIdsFor(userId);
  const { members } = await getCollections();
  const current = await members.findOne({ _id: userId });
  if (!current) {
    response.status(404).json({ message: 'Your profile could not be found.' });
    return;
  }
  const filter: Filter<MemberDocument> = {
    _id: { $nin: [userId, ...blockedIds] },
  };
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
  if (interests.length) filter['profile.interests'] = { $in: interests };
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

resourceRouter.get('/invitations', async (request, response) => {
  const userId = authenticatedUserId(response);
  const blockedIds = await blockedPeerIdsFor(userId);
  const limit = pageLimit(request.query.limit);
  const cursor = decodeCursor<{ createdAt: string; id: string }>(request.query.cursor);
  const direction = request.query.direction;
  const ownership: Filter<InvitationDocument> =
    direction === 'sent'
      ? { senderId: userId }
      : direction === 'received'
        ? { receiverId: userId }
        : { $or: [{ senderId: userId }, { receiverId: userId }] };
  const clauses: Filter<InvitationDocument>[] = [
    ownership,
    { senderId: { $nin: blockedIds } },
    { receiverId: { $nin: blockedIds } },
  ];
  if (cursor) {
    clauses.push({
      $or: [
        { createdAt: { $lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
      ],
    });
  }
  const filter: Filter<InvitationDocument> = { $and: clauses };

  const { invitations } = await getCollections();
  const documents = await invitations
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .toArray();
  const pageDocuments = documents.slice(0, limit);
  const last = pageDocuments.at(-1);
  const page: Page<Invitation> = {
    items: pageDocuments.map(invitationFromDocument),
    ...(documents.length > limit && last
      ? { nextCursor: encodeCursor({ createdAt: last.createdAt, id: last._id }) }
      : {}),
  };
  response.json(page);
});

resourceRouter.get('/saved', async (request, response) => {
  const userId = authenticatedUserId(response);
  const limit = pageLimit(request.query.limit);
  const cursor = decodeCursor<{ createdAt: string; id: string }>(request.query.cursor);
  const filter = cursor
    ? {
        userId,
        $or: [
          { createdAt: { $lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
        ],
      }
    : { userId };

  const { savedActivities } = await getCollections();
  const documents = await savedActivities
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .toArray();
  const pageDocuments = documents.slice(0, limit);
  const last = pageDocuments.at(-1);
  const page: Page<string> = {
    items: pageDocuments.map((saved) => saved.activityId),
    ...(documents.length > limit && last
      ? { nextCursor: encodeCursor({ createdAt: last.createdAt, id: last._id }) }
      : {}),
  };
  response.json(page);
});
