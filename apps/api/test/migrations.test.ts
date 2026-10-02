import { describe, expect, it } from 'vitest';

import { createDb, createMigrator, migrateToLatest } from '../src/database/db.ts';
import { migrations } from '../src/database/migrations/index.ts';
import { createTestDatabase } from './support/app.ts';

describe('migrations', () => {
  it('roll back completely and re-apply cleanly (every down() works)', async () => {
    const db = createDb(await createTestDatabase(), { poolMax: 1, statementTimeoutMs: 60_000 });
    try {
      const migrator = createMigrator(db);
      for (let i = 0; i < Object.keys(migrations).length; i += 1) {
        const { error } = await migrator.migrateDown();
        expect(error).toBeUndefined();
      }
      const pending = await migrator.getMigrations();
      expect(pending.every((m) => m.executedAt === undefined)).toBe(true);

      const applied = await migrateToLatest(db);
      expect(applied).toEqual(Object.keys(migrations));
    } finally {
      await db.destroy();
    }
  });
});
