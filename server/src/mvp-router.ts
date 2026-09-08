import { randomUUID } from 'node:crypto';

import { Router, type ErrorRequestHandler } from 'express';
import { z } from 'zod';

import {
  ACTIVITY_CATEGORIES,
  REPORT_REASONS,
  type Activity,
  type Profile,
  type SafetyReportReceipt,
} from '../../src/types/domain';
import { authenticatedUserId } from './auth';
import { getCollections } from './database';

class MvpHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const fail = (status: number, message: string): never => {
  throw new MvpHttpError(status, message);
};

const requiredText = (label: string, minimum = 2) =>
  z.string().trim().min(minimum, `${label} must be at least ${minimum} characters.`);

const activityUpdateSchema = z.object({
  title: requiredText('Title', 4).max(70),
  description: requiredText('Description', 20).max(500),
  category: z.enum(ACTIVITY_CATEGORIES),
  startAt: z.iso.datetime(),
  location: requiredText('Location', 3).max(160),
  city: requiredText('City').max(80),
  capacity: z.number().int().min(2).max(30),
  visibility: z.enum(['community', 'invite-only']),
  vibe: z.enum(['Easygoing', 'Active', 'Focused']),
});

const reportSchema = z.object({
  targetType: z.enum(['profile', 'activity']),
  targetId: z.string().trim().min(1).max(100),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).optional(),
});

const activityFromDocument = (document: { _id: string } & Activity): Activity => {
  const { _id: _mongoId, ...activity } = document;
  return activity;
};

const publicProfile = (
  member: { _id: string; email: string; profile: Omit<Profile, 'email'> },
  viewerId: string,
): Profile => ({
  ...member.profile,
  email: member._id === viewerId ? member.email : undefined,
});

const isCancelled = (activity: Pick<Activity, 'status'>) => activity.status === 'cancelled';

const hasBlockBetween = async (firstId: string, secondId: string) => {
  const { userBlocks } = await getCollections();
  return Boolean(
    await userBlocks.findOne({
      $or: [
        { blockerId: firstId, blockedId: secondId },
        { blockerId: secondId, blockedId: firstId },
      ],
    }),
  );
};

export const activityLifecycleRouter = Router();

activityLifecycleRouter.patch('/:activityId', async (request, response) => {
  const userId = authenticatedUserId(response);
  const input = activityUpdateSchema.parse(request.body);
  const { activities } = await getCollections();
  const existing = await activities.findOne({ _id: request.params.activityId });
  if (!existing) fail(404, 'The activity could not be found.');
  if (existing.hostId !== userId) fail(403, 'Only the host can edit this plan.');
  if (isCancelled(existing)) fail(409, 'A cancelled plan cannot be edited.');
  if (new Date(existing.startAt).getTime() <= Date.now()) {
    fail(409, 'A plan that has already started cannot be edited.');
  }
  if (new Date(input.startAt).getTime() <= Date.now()) {
    fail(400, 'Choose a time in the future.');
  }
  if (input.capacity < existing.attendeeIds.length) {
    fail(409, `Capacity cannot be lower than the ${existing.attendeeIds.length} people already going.`);
  }

  await activities.updateOne(
    { _id: existing._id, hostId: userId, status: { $ne: 'cancelled' } },
    {
      $set: {
        title: input.title,
        description: input.description,
        category: input.category,
        startAt: input.startAt,
        location: input.location,
        city: input.city,
        capacity: input.capacity,
        visibility: input.visibility,
        vibe: input.vibe,
      },
    },
  );
  const updated = await activities.findOne({ _id: existing._id });
  if (!updated) fail(404, 'The activity could not be found.');
  response.json(activityFromDocument(updated));
});

activityLifecycleRouter.delete('/:activityId/attendees/me', async (request, response) => {
  const userId = authenticatedUserId(response);
  const { activities } = await getCollections();
  const activity = await activities.findOne({ _id: request.params.activityId });
  if (!activity) fail(404, 'The activity could not be found.');
  if (activity.hostId === userId) {
    fail(409, 'Hosts cannot leave their own plan. Edit or cancel the plan instead.');
  }
  if (!activity.attendeeIds.includes(userId)) {
    response.status(204).end();
    return;
  }
  if (new Date(activity.startAt).getTime() <= Date.now()) {
    fail(409, 'This activity has already started.');
  }
  await activities.updateOne({ _id: activity._id }, { $pull: { attendeeIds: userId } });
  response.status(204).end();
});

activityLifecycleRouter.delete('/:activityId', async (request, response) => {
  const userId = authenticatedUserId(response);
  const { activities, invitations } = await getCollections();
  const activity = await activities.findOne({ _id: request.params.activityId });
  if (!activity) fail(404, 'The activity could not be found.');
  if (activity.hostId !== userId) fail(403, 'Only the host can cancel this plan.');
  if (isCancelled(activity)) {
    response.status(204).end();
    return;
  }
  if (new Date(activity.startAt).getTime() <= Date.now()) {
    fail(409, 'A plan that has already started cannot be cancelled.');
  }

  const cancelledAt = new Date().toISOString();
  await activities.updateOne(
    { _id: activity._id, hostId: userId, status: { $ne: 'cancelled' } },
    { $set: { status: 'cancelled', cancelledAt } },
  );
  await invitations.updateMany(
    { activityId: activity._id, status: 'pending' },
    {
      $set: { status: 'cancelled', respondedAt: cancelledAt },
      $unset: { activeKey: '' },
    },
  );
  response.status(204).end();
});

// Preflight existing compatibility join route so cancelled/blocked plans cannot be joined.
activityLifecycleRouter.put('/:activityId/attendees/me', async (request, response, next) => {
  const userId = authenticatedUserId(response);
  const { activities } = await getCollections();
  const activity = await activities.findOne({ _id: request.params.activityId });
  if (!activity) {
    next();
    return;
  }
  if (isCancelled(activity)) fail(409, 'This plan has been cancelled.');
  if (await hasBlockBetween(userId, activity.hostId)) {
    fail(403, 'You cannot join this plan.');
  }
  next();
});

export const invitationSafetyRouter = Router();

// Preflight the existing invitation creation route without duplicating its validation/business logic.
invitationSafetyRouter.post('/', async (request, response, next) => {
  const userId = authenticatedUserId(response);
  const inputs = Array.isArray(request.body?.invitations) ? request.body.invitations : [];
  const activityId = typeof inputs[0]?.activityId === 'string' ? inputs[0].activityId : undefined;
  if (!activityId) {
    next();
    return;
  }
  const { activities, userBlocks } = await getCollections();
  const activity = await activities.findOne({ _id: activityId });
  if (!activity) {
    next();
    return;
  }
  if (isCancelled(activity)) fail(409, 'Invitations cannot be sent for a cancelled plan.');
  const receiverIds = [
    ...new Set(
      inputs
        .map((input: unknown) =>
          typeof (input as { receiverId?: unknown })?.receiverId === 'string'
            ? (input as { receiverId: string }).receiverId
            : undefined,
        )
        .filter((value: string | undefined): value is string => Boolean(value)),
    ),
  ];
  if (receiverIds.length) {
    const blocked = await userBlocks.findOne({
      $or: [
        { blockerId: userId, blockedId: { $in: receiverIds } },
        { blockerId: { $in: receiverIds }, blockedId: userId },
      ],
    });
    if (blocked) fail(403, 'One or more selected people cannot be invited.');
  }
  next();
});

invitationSafetyRouter.patch('/:invitationId', async (request, response, next) => {
  const userId = authenticatedUserId(response);
  const { invitations, activities } = await getCollections();
  const invitation = await invitations.findOne({ _id: request.params.invitationId });
  if (!invitation) {
    next();
    return;
  }
  const activity = await activities.findOne({ _id: invitation.activityId });
  if (activity && isCancelled(activity)) fail(409, 'This plan has been cancelled.');
  const otherId = invitation.senderId === userId ? invitation.receiverId : invitation.senderId;
  if (await hasBlockBetween(userId, otherId)) {
    fail(403, 'This invitation can no longer be changed.');
  }
  next();
});

export const peopleSafetyRouter = Router();

peopleSafetyRouter.put('/:profileId/block', async (request, response) => {
  const userId = authenticatedUserId(response);
  const blockedId = request.params.profileId;
  if (blockedId === userId) fail(400, 'You cannot block your own profile.');
  const { members, userBlocks, invitations, activities, savedActivities } = await getCollections();
  if (!(await members.findOne({ _id: blockedId }, { projection: { _id: 1 } }))) {
    fail(404, 'This profile could not be found.');
  }

  const createdAt = new Date().toISOString();
  await userBlocks.updateOne(
    { blockerId: userId, blockedId },
    {
      $setOnInsert: {
        _id: `${userId}:${blockedId}`,
        blockerId: userId,
        blockedId,
        createdAt,
      },
    },
    { upsert: true },
  );
  await invitations.updateMany(
    {
      status: 'pending',
      $or: [
        { senderId: userId, receiverId: blockedId },
        { senderId: blockedId, receiverId: userId },
      ],
    },
    {
      $set: { status: 'cancelled', respondedAt: createdAt },
      $unset: { activeKey: '' },
    },
  );

  const hostedByBlocked = await activities
    .find({ hostId: blockedId }, { projection: { _id: 1 } })
    .toArray();
  if (hostedByBlocked.length) {
    await savedActivities.deleteMany({
      userId,
      activityId: { $in: hostedByBlocked.map((activity) => activity._id) },
    });
  }
  response.status(204).end();
});

peopleSafetyRouter.delete('/:profileId/block', async (request, response) => {
  const userId = authenticatedUserId(response);
  const { userBlocks } = await getCollections();
  await userBlocks.deleteOne({ blockerId: userId, blockedId: request.params.profileId });
  response.status(204).end();
});

export const blocksRouter = Router();

blocksRouter.get('/', async (_request, response) => {
  const userId = authenticatedUserId(response);
  const { userBlocks, members } = await getCollections();
  const blocks = await userBlocks.find({ blockerId: userId }).sort({ createdAt: -1 }).toArray();
  const blockedIds = blocks.map((block) => block.blockedId);
  if (!blockedIds.length) {
    response.json([]);
    return;
  }
  const profiles = await members.find({ _id: { $in: blockedIds } }).toArray();
  const byId = new Map(profiles.map((member) => [member._id, member]));
  response.json(
    blockedIds
      .map((id) => byId.get(id))
      .filter((member) => member !== undefined)
      .map((member) => publicProfile(member, userId)),
  );
});

export const reportsRouter = Router();

reportsRouter.post('/', async (request, response) => {
  const userId = authenticatedUserId(response);
  const input = reportSchema.parse(request.body);
  const { members, activities, safetyReports } = await getCollections();
  if (input.targetType === 'profile') {
    if (input.targetId === userId) fail(400, 'You cannot report your own profile.');
    if (!(await members.findOne({ _id: input.targetId }, { projection: { _id: 1 } }))) {
      fail(404, 'This profile could not be found.');
    }
  } else if (!(await activities.findOne({ _id: input.targetId }, { projection: { _id: 1 } }))) {
    fail(404, 'This activity could not be found.');
  }

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await safetyReports.insertOne({
    _id: id,
    reporterId: userId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    ...(input.details ? { details: input.details } : {}),
    status: 'open',
    createdAt,
    updatedAt: createdAt,
  });
  const receipt: SafetyReportReceipt = { id, status: 'open', createdAt };
  response.status(201).json(receipt);
});

export const savedActivitySafetyRouter = Router();

savedActivitySafetyRouter.put('/:activityId', async (request, response, next) => {
  const userId = authenticatedUserId(response);
  const { activities } = await getCollections();
  const activity = await activities.findOne({ _id: request.params.activityId });
  if (!activity) {
    next();
    return;
  }
  if (await hasBlockBetween(userId, activity.hostId)) {
    fail(403, 'You cannot save this activity.');
  }
  next();
});

export const mvpRouterErrorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  next,
) => {
  if (error instanceof MvpHttpError) {
    response.status(error.status).json({ message: error.message });
    return;
  }
  if (error instanceof z.ZodError) {
    response.status(400).json({ message: error.issues[0]?.message ?? 'Check the request.' });
    return;
  }
  next(error);
};
