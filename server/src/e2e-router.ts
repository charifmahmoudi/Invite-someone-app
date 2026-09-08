import { Router } from 'express';
import { z } from 'zod';

import { config } from './config';
import {
  assertSafeE2EFixtureConfig,
  E2E_FIXTURE_IDS,
  isE2EFixtureTokenValid,
  resetE2EFixtures,
} from './e2e-fixtures';
import { pingDatabase } from './database';

const resetSchema = z.object({
  firebaseIdentities: z
    .array(
      z.object({
        userId: z.string().min(1).max(100),
        providerSubject: z.string().min(1).max(200),
        email: z.email(),
        emailVerified: z.boolean(),
      }),
    )
    .max(20)
    .default([]),
});

const router = Router();

router.use((request, response, next) => {
  if (!config.e2eFixturesEnabled || !config.e2eFixturesToken) {
    response.status(404).json({ message: 'Not found.' });
    return;
  }
  try {
    assertSafeE2EFixtureConfig({
      databaseName: config.databaseName,
      enabled: config.e2eFixturesEnabled,
      token: config.e2eFixturesToken,
    });
  } catch {
    response.status(404).json({ message: 'Not found.' });
    return;
  }
  const authorization = request.header('authorization');
  const supplied = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  if (!isE2EFixtureTokenValid(config.e2eFixturesToken, supplied)) {
    response.status(401).json({ message: 'Unauthorized.' });
    return;
  }
  next();
});

router.get('/ready', async (_request, response) => {
  await pingDatabase();
  response.json({ status: 'ready', fixtures: E2E_FIXTURE_IDS });
});

router.post('/reset', async (request, response) => {
  const input = resetSchema.parse(request.body ?? {});
  response.json(await resetE2EFixtures(input.firebaseIdentities));
});

export const e2eRouter = router;
