import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';

import { createApp } from './app';
import { requireAuthentication } from './auth';
import { config } from './config';
import { closeDatabase } from './database';
import { identityRouter } from './identity-router';
import { resourceRouter } from './resource-router';

const resourceReadPaths = new Set(['/me', '/activities', '/people', '/invitations', '/saved']);

const start = () => {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '256kb' }));

  // Managed identity provisioning lives beside, not inside, the compatibility password API.
  // /login and /register simply fall through when they do not match this router.
  app.use('/v1/auth', identityRouter);

  // New resource-oriented reads live ahead of the compatibility app. Only these
  // GET routes require auth here; /v1/auth/login and /v1/auth/register must stay
  // public so current binaries can still establish a session.
  app.use(
    '/v1',
    (request, response, next) => {
      if (request.method !== 'GET' || !resourceReadPaths.has(request.path)) {
        next();
        return;
      }
      return requireAuthentication(request, response, next);
    },
    resourceRouter,
  );

  app.use(createApp());

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    console.error(error);
    response.status(500).json({ message: 'The server could not complete that request.' });
  });

  const server = app.listen(config.port, () => {
    console.log(`Invite API listening on port ${config.port}.`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received; closing the Invite API.`);
    server.close(() => {
      void closeDatabase().finally(() => process.exit(0));
    });
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
};

try {
  start();
} catch (error: unknown) {
  console.error('Invite API failed to start.', error);
  process.exitCode = 1;
}
