import { createDb, createMigrator, migrateToLatest } from './db.ts';
import { DEV_PASSWORD, seedDevelopmentData } from './seed.ts';

/**
 * Database CLI: `migrate` (to latest), `rollback` (one step) and `seed` (development data).
 * Run with the built output: `pnpm --filter @mawjood/api db:migrate`.
 */
const command = process.argv[2];
const url = process.env.DATABASE_URL;
const appEnv = process.env.APP_ENV ?? 'development';

if (!url) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

// Migrations may legitimately run longer than API queries.
const db = createDb(url, { poolMax: 1, statementTimeoutMs: 300_000 });

try {
  if (command === 'migrate') {
    const applied = await migrateToLatest(db);
    console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Already up to date');
  } else if (command === 'rollback') {
    const { error, results } = await createMigrator(db).migrateDown();
    if (error) throw error;
    console.log(
      results?.length
        ? `Rolled back: ${results.map((r) => r.migrationName).join(', ')}`
        : 'Nothing to roll back',
    );
  } else if (command === 'seed') {
    if (appEnv !== 'development') {
      throw new Error(`Refusing to seed development data when APP_ENV=${appEnv}`);
    }
    const seeded = await seedDevelopmentData(db);
    console.log(
      seeded
        ? `Seeded development data (password for all accounts: ${DEV_PASSWORD})`
        : 'Development data already present; reset the database to seed again',
    );
  } else {
    console.error('Usage: cli.js <migrate|rollback|seed>');
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
