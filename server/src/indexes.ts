import { closeDatabase, ensureDatabaseIndexes } from './database';

ensureDatabaseIndexes()
  .then(() => {
    console.log('Invite MongoDB indexes are ready.');
  })
  .catch((error: unknown) => {
    console.error('Could not ensure Invite MongoDB indexes.', error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
