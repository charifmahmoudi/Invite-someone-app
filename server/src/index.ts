import { createApp } from './app';
import { config } from './config';
import { closeDatabase, getDatabase } from './database';

const start = async () => {
  await getDatabase();
  const server = createApp().listen(config.port, () => {
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

start().catch((error: unknown) => {
  console.error('Invite API failed to start.', error);
  process.exitCode = 1;
});
