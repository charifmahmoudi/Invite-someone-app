import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';

import { createApp } from './app';
import { requireAuthentication } from './auth';
import { config } from './config';
import { closeDatabase } from './database';
import { resourceRouter } from './resource-router';

const start = () => {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));

  // New resource-oriented reads live ahead of the compatibility app. Unmatched
  // routes fall through to the existing API so current mobile binaries continue
  // to work while clients migrate away from the broad /v1/data bootstrap.
  app.use('/v1', requireAuthentication, resourceRouter);
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
