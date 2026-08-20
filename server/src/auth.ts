import type { NextFunction, Request, Response } from 'express';
import { jwtVerify, SignJWT } from 'jose';

import { config } from './config';

const jwtKey = new TextEncoder().encode(config.jwtSecret);
const issuer = 'invite-someone-api';
const audience = 'invite-someone-mobile';

export const issueAccessToken = (userId: string) =>
  new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime('30d')
    .sign(jwtKey);

export const requireAuthentication = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  const authorization = request.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  if (!token) {
    response.status(401).json({ message: 'Sign in to continue.' });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, jwtKey, { issuer, audience });
    if (!payload.sub) throw new Error('Missing subject.');
    response.locals.userId = payload.sub;
    next();
  } catch {
    response.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
};

export const authenticatedUserId = (response: Response): string => response.locals.userId as string;
