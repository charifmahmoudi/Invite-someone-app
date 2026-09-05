import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify, SignJWT, type JWTPayload } from 'jose';

import { config } from './config';
import { getCollections } from './database';

const jwtKey = new TextEncoder().encode(config.jwtSecret);
const internalIssuer = 'invite-someone-api';
const internalAudience = 'invite-someone-mobile';
const clerkJwks = config.clerkJwksUrl
  ? createRemoteJWKSet(new URL(config.clerkJwksUrl))
  : undefined;

export interface AuthIdentity {
  provider: 'internal' | 'clerk';
  subject: string;
  email?: string;
  emailVerified?: boolean;
}

export interface ResolvedAuthIdentity extends AuthIdentity {
  email?: string;
  emailVerified?: boolean;
}

const stringClaim = (payload: JWTPayload, names: string[]) => {
  for (const name of names) {
    const value = payload[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

const booleanClaim = (payload: JWTPayload, names: string[]) => {
  for (const name of names) {
    const value = payload[name];
    if (typeof value === 'boolean') return value;
  }
  return undefined;
};

const verifyIdentityToken = async (token: string): Promise<AuthIdentity> => {
  if (config.authMode === 'clerk') {
    if (!clerkJwks || !config.clerkIssuer) throw new Error('Clerk authentication is not configured.');
    const { payload } = await jwtVerify(token, clerkJwks, {
      issuer: config.clerkIssuer,
      ...(config.clerkAudience ? { audience: config.clerkAudience } : {}),
    });
    if (!payload.sub) throw new Error('Missing Clerk subject.');
    return {
      provider: 'clerk',
      subject: payload.sub,
      email: stringClaim(payload, ['email', 'email_address', 'primary_email_address']),
      emailVerified: booleanClaim(payload, ['email_verified', 'email_address_verified']),
    };
  }

  const { payload } = await jwtVerify(token, jwtKey, {
    issuer: internalIssuer,
    audience: internalAudience,
  });
  if (!payload.sub) throw new Error('Missing subject.');
  return { provider: 'internal', subject: payload.sub };
};

const bearerToken = (request: Request) => {
  const authorization = request.header('authorization');
  return authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
};

const authenticate = async (request: Request, response: Response) => {
  const token = bearerToken(request);
  if (!token) {
    response.status(401).json({ message: 'Sign in to continue.' });
    return undefined;
  }

  try {
    const identity = await verifyIdentityToken(token);
    response.locals.identity = identity;
    return identity;
  } catch {
    response.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    return undefined;
  }
};

export const issueAccessToken = (userId: string) => {
  if (config.authMode !== 'internal') {
    throw new Error('Invite-issued access tokens are disabled when AUTH_MODE=clerk.');
  }
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(internalIssuer)
    .setAudience(internalAudience)
    .setExpirationTime('30d')
    .sign(jwtKey);
};

export const requireIdentity = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  const identity = await authenticate(request, response);
  if (identity) next();
};

export const requireAuthentication = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  const identity = await authenticate(request, response);
  if (!identity) return;

  if (identity.provider === 'internal') {
    response.locals.userId = identity.subject;
    next();
    return;
  }

  const { userIdentities } = await getCollections();
  const mapping = await userIdentities.findOne({
    provider: 'clerk',
    providerSubject: identity.subject,
  });
  if (!mapping) {
    response.status(403).json({
      code: 'INVITE_PROFILE_REQUIRED',
      message: 'Complete your Invite profile to continue.',
    });
    return;
  }

  response.locals.userId = mapping.userId;
  next();
};

export const authenticatedUserId = (response: Response): string => response.locals.userId as string;
export const authenticatedIdentity = (response: Response): AuthIdentity =>
  response.locals.identity as AuthIdentity;

/**
 * Clerk session tokens do not have to carry profile/email claims. Provisioning
 * needs a positively verified primary email, so consult Clerk whenever the token
 * itself does not already prove both the address and its verification state.
 */
export const resolveClerkIdentity = async (
  identity: AuthIdentity,
): Promise<ResolvedAuthIdentity> => {
  if (identity.provider !== 'clerk') return identity;
  if (identity.email && identity.emailVerified === true) return identity;
  if (!config.clerkSecretKey) return identity;

  const result = await fetch(
    `https://api.clerk.com/v1/users/${encodeURIComponent(identity.subject)}`,
    { headers: { Authorization: `Bearer ${config.clerkSecretKey}` } },
  );
  if (!result.ok) throw new Error(`Clerk user lookup failed with status ${result.status}.`);

  const user = (await result.json()) as {
    primary_email_address_id?: string | null;
    email_addresses?: {
      id: string;
      email_address: string;
      verification?: { status?: string };
    }[];
  };
  const primary =
    user.email_addresses?.find((address) => address.id === user.primary_email_address_id) ??
    user.email_addresses?.[0];
  return {
    ...identity,
    email: primary?.email_address ?? identity.email,
    emailVerified: primary?.verification?.status === 'verified',
  };
};
