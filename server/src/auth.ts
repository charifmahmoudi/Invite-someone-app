import type { NextFunction, Request, Response } from 'express';
import { jwtVerify, SignJWT } from 'jose';

import { config } from './config';
import { getCollections } from './database';

const jwtKey = new TextEncoder().encode(config.jwtSecret);
const internalIssuer = 'invite-someone-api';
const internalAudience = 'invite-someone-mobile';

export interface AuthIdentity {
  provider: 'internal' | 'supabase';
  subject: string;
  email?: string;
  emailVerified?: boolean;
}

interface SupabaseUser {
  id?: string;
  email?: string;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
}

const verifySupabaseToken = async (token: string): Promise<AuthIdentity> => {
  if (!config.supabaseUrl || !config.supabasePublishableKey) {
    throw new Error('Supabase authentication is not configured.');
  }

  const result = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: config.supabasePublishableKey,
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!result.ok) throw new Error(`Supabase token validation failed with status ${result.status}.`);

  const user = (await result.json()) as SupabaseUser;
  if (!user.id) throw new Error('Missing Supabase user ID.');

  return {
    provider: 'supabase',
    subject: user.id,
    email: user.email,
    emailVerified: Boolean(user.email && (user.email_confirmed_at || user.confirmed_at)),
  };
};

const verifyIdentityToken = async (token: string): Promise<AuthIdentity> => {
  if (config.authMode === 'supabase') return verifySupabaseToken(token);

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
    throw new Error('Invite-issued access tokens are disabled when managed authentication is enabled.');
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
    provider: 'supabase',
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
