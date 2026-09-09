import type { NextFunction, Request, Response } from 'express';
import { decodeProtectedHeader, importX509, jwtVerify, SignJWT } from 'jose';

import { config } from './config';
import { getCollections } from './database';

const jwtKey = new TextEncoder().encode(config.jwtSecret);
const internalIssuer = 'invite-someone-api';
const internalAudience = 'invite-someone-mobile';
const firebaseCertsUrl =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

export interface AuthIdentity {
  provider: 'internal' | 'firebase';
  subject: string;
  email?: string;
  emailVerified?: boolean;
}

interface FirebaseCertCache {
  certificates: Record<string, string>;
  expiresAt: number;
}

let firebaseCertCache: FirebaseCertCache | undefined;

const loadFirebaseCertificates = async (force = false) => {
  if (!force && firebaseCertCache && firebaseCertCache.expiresAt > Date.now() + 5_000) {
    return firebaseCertCache.certificates;
  }

  const response = await fetch(firebaseCertsUrl, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) {
    throw new Error(`Firebase signing-key lookup failed with status ${response.status}.`);
  }

  const certificates = (await response.json()) as Record<string, string>;
  const cacheControl = response.headers.get('cache-control') ?? '';
  const maxAgeSeconds = Number(/max-age=(\d+)/i.exec(cacheControl)?.[1] ?? 3600);
  firebaseCertCache = {
    certificates,
    expiresAt: Date.now() + Math.max(maxAgeSeconds, 60) * 1_000,
  };
  return certificates;
};

const verifyFirebaseToken = async (token: string): Promise<AuthIdentity> => {
  const projectId = config.firebaseProjectId;
  if (!projectId) throw new Error('Firebase authentication is not configured.');

  const header = decodeProtectedHeader(token);
  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Invalid Firebase ID-token header.');
  }

  let certificates = await loadFirebaseCertificates();
  let certificate = certificates[header.kid];
  if (!certificate) {
    certificates = await loadFirebaseCertificates(true);
    certificate = certificates[header.kid];
  }
  if (!certificate) throw new Error('Firebase signing key is unknown.');

  const key = await importX509(certificate, 'RS256');
  const { payload } = await jwtVerify(token, key, {
    algorithms: ['RS256'],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
    clockTolerance: 60,
  });

  const now = Math.floor(Date.now() / 1_000);
  if (!payload.sub) throw new Error('Missing Firebase user ID.');
  if (typeof payload.iat !== 'number' || payload.iat > now + 60) {
    throw new Error('Invalid Firebase issued-at time.');
  }
  if (typeof payload.auth_time !== 'number' || payload.auth_time > now + 60) {
    throw new Error('Invalid Firebase authentication time.');
  }

  return {
    provider: 'firebase',
    subject: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    emailVerified: payload.email_verified === true,
  };
};

const verifyIdentityToken = async (token: string): Promise<AuthIdentity> => {
  if (config.authMode === 'firebase') return verifyFirebaseToken(token);

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
    provider: 'firebase',
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
