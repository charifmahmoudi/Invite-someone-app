import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

import { z } from 'zod';

// Node 22+ can load a local server-only env file without adding another runtime dependency.
if (existsSync('.env.server')) loadEnvFile('.env.server');

const DEVELOPMENT_JWT_SECRET = 'invite-local-development-secret-change-me';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017'),
  MONGODB_DB_NAME: z.string().min(1).default('invite_someone'),
  JWT_SECRET: z.string().min(32).default(DEVELOPMENT_JWT_SECRET),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  CORS_ORIGINS: z.string().default('*'),
});

const parsed = environmentSchema.parse(process.env);
if (parsed.NODE_ENV === 'production' && parsed.JWT_SECRET === DEVELOPMENT_JWT_SECRET) {
  throw new Error('Set a strong JWT_SECRET before starting the Invite API in production.');
}

export const config = {
  nodeEnv: parsed.NODE_ENV,
  mongoUri: parsed.MONGODB_URI,
  databaseName: parsed.MONGODB_DB_NAME,
  jwtSecret: parsed.JWT_SECRET,
  port: parsed.PORT,
  corsOrigins:
    parsed.CORS_ORIGINS === '*'
      ? '*'
      : parsed.CORS_ORIGINS.split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
} as const;
