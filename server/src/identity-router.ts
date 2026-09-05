import { randomUUID } from 'node:crypto';

import { hash } from 'bcryptjs';
import { Router } from 'express';
import { MongoServerError } from 'mongodb';
import { z } from 'zod';

import {
  ACTIVITY_CATEGORIES,
  AVAILABILITY_OPTIONS,
  CONNECTION_GOALS,
  type Profile,
} from '../../src/types/domain';
import { authenticatedIdentity, requireIdentity, resolveClerkIdentity } from './auth';
import { config } from './config';
import { getCollections, startSession, type GeoPoint, type MemberDocument } from './database';

const provisionSchema = z.object({
  name: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(80),
  interests: z.array(z.enum(ACTIVITY_CATEGORIES)).min(1).max(8),
  availability: z.array(z.enum(AVAILABILITY_OPTIONS)).min(1).max(4),
  connectionGoals: z.array(z.enum(CONNECTION_GOALS)).min(1).max(4),
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

export const identityRouter = Router();

/**
 * Converts an authenticated Clerk identity into an Invite user exactly once.
 * Existing email/password accounts are deliberately NOT linked by email alone;
 * account migration/linking needs a separate recent-authenticated flow.
 */
identityRouter.post('/provision', requireIdentity, async (request, response) => {
  if (config.authMode !== 'clerk') {
    response.status(404).json({ message: 'External identity provisioning is not enabled.' });
    return;
  }

  const input = provisionSchema.parse(request.body);
  const rawIdentity = authenticatedIdentity(response);
  if (rawIdentity.provider !== 'clerk') {
    response.status(400).json({ message: 'A Clerk identity is required.' });
    return;
  }

  const { members, userIdentities } = await getCollections();
  const existingIdentity = await userIdentities.findOne({
    provider: 'clerk',
    providerSubject: rawIdentity.subject,
  });
  if (existingIdentity) {
    const existingMember = await members.findOne({ _id: existingIdentity.userId });
    if (!existingMember) {
      response.status(409).json({
        code: 'IDENTITY_MAPPING_INVALID',
        message: 'This identity mapping needs administrator repair.',
      });
      return;
    }
    response.json({
      created: false,
      userId: existingMember._id,
      profile: { ...existingMember.profile, email: existingMember.email },
    });
    return;
  }

  const identity = await resolveClerkIdentity(rawIdentity);
  if (!identity.email) {
    response.status(400).json({
      code: 'PRIMARY_EMAIL_REQUIRED',
      message: 'A primary email address is required to create an Invite profile.',
    });
    return;
  }
  if (identity.emailVerified !== true) {
    response.status(400).json({
      code: 'VERIFIED_EMAIL_REQUIRED',
      message: 'A verified primary email is required before creating an Invite profile.',
    });
    return;
  }

  const email = normalizeEmail(identity.email);
  const existingMember = await members.findOne({ emailNormalized: email });
  if (existingMember) {
    response.status(409).json({
      code: 'ACCOUNT_LINK_REQUIRED',
      message: 'An Invite account already uses this email. Sign in to that account to link it safely.',
    });
    return;
  }

  const userId = randomUUID();
  const now = new Date().toISOString();
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
  const mapPoint = mapPointForProfile(profile);

  // Keep the compatibility schema valid while internal password auth still exists.
  // This random secret is never returned and cannot be used as a real credential.
  const disabledPasswordHash = await hash(randomUUID(), 12);
  const member: MemberDocument = {
    _id: userId,
    email,
    emailNormalized: email,
    passwordHash: disabledPasswordHash,
    profile,
    ...(mapPoint ? { mapPoint } : {}),
    createdAt: now,
    updatedAt: now,
  };

  const session = startSession();
  try {
    await session.withTransaction(async () => {
      await members.insertOne(member, { session });
      await userIdentities.insertOne(
        {
          _id: randomUUID(),
          userId,
          provider: 'clerk',
          providerSubject: identity.subject,
          email,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        },
        { session },
      );
    });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      const racedIdentity = await userIdentities.findOne({
        provider: 'clerk',
        providerSubject: identity.subject,
      });
      if (racedIdentity) {
        const racedMember = await members.findOne({ _id: racedIdentity.userId });
        if (racedMember) {
          response.json({
            created: false,
            userId: racedMember._id,
            profile: { ...racedMember.profile, email: racedMember.email },
          });
          return;
        }
      }
      response.status(409).json({
        code: 'ACCOUNT_LINK_REQUIRED',
        message: 'An Invite account already uses this email or identity.',
      });
      return;
    }
    throw error;
  } finally {
    await session.endSession();
  }

  response.status(201).json({
    created: true,
    userId,
    profile: { ...profile, email },
  });
});
