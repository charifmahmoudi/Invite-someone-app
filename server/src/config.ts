import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

import { z } from 'zod';

if (existsSync('.env.server')) loadEnvFile('.env.server');

const DEVELOPMENT_JWT_SECRET = 'invite-local-development-secret-change-me';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017'),
  MONGODB_DB_NAME: z.string().min(1).default('invite_someone'),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().min(1).max(50).default(5),
  MONGODB_MAX_IDLE_TIME_MS: z.coerce.number().int().min(1_000).max(300_000).default(30_000),
  MONGODB_ENSURE_INDEXES_ON_START: z.enum(['true', 'false']).default('false'),
  AUTH_MODE: z.enum(['internal', 'firebase']).default('internal'),
  JWT_SECRET: z.string().min(32).default(DEVELOPMENT_JWT_SECRET),
  FIREBASE_PROJECT_ID: z.string().trim().min(1).optional(),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  CORS_ORIGINS: z.string().default('*'),
});

const parsed = environmentSchema.parse(process.env);
if (
  parsed.NODE_ENV === 'production' &&
  parsed.AUTH_MODE === 'internal' &&
  parsed.JWT_SECRET === DEVELOPMENT_JWT_SECRET
) {
  throw new Error('Set a strong JWT_SECRET before starting internal auth in production.');
}
if (parsed.AUTH_MODE === 'firebase' && !parsed.FIREBASE_PROJECT_ID) {
  throw new Error('FIREBASE_PROJECT_ID is required when AUTH_MODE=firebase.');
}

export const config = {
  nodeEnv: parsed.NODE_ENV,
  mongoUri: parsed.MONGODB_URI,
  databaseName: parsed.MONGODB_DB_NAME,
  mongoMaxPoolSize: parsed.MONGODB_MAX_POOL_SIZE,
  mongoMaxIdleTimeMs: parsed.MONGODB_MAX_IDLE_TIME_MS,
  ensureIndexesOnStart: parsed.MONGODB_ENSURE_INDEXES_ON_START === 'true',
  authMode: parsed.AUTH_MODE,
  jwtSecret: parsed.JWT_SECRET,
  firebaseProjectId: parsed.FIREBASE_PROJECT_ID,
  port: parsed.PORT,
  corsOrigins:
    parsed.CORS_ORIGINS === '*'
      ? '*'
      : parsed.CORS_ORIGINS.split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
} as const;
