import { Kysely, PostgresDialect } from 'kysely';
import { Migrator } from 'kysely/migration';
import pg from 'pg';

import { migrations } from './migrations/index.ts';
import type { Database } from './schema.ts';

export type Db = Kysely<Database>;

/** Injection token for the Kysely instance. */
export const DB = Symbol('DB');

const INT8_OID = 20;

// bigint columns hold money in minor units; parse to number but never silently lose precision.
pg.types.setTypeParser(INT8_OID, (value: string) => {
  const n = Number(value);
  if (!Number.isSafeInteger(n))
    throw new Error(`int8 value ${value} exceeds the safe integer range`);
  return n;
});

type DbOptions = { poolMax?: number; statementTimeoutMs?: number };

export function createDb(connectionString: string, options: DbOptions = {}): Db {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({
        connectionString,
        max: options.poolMax ?? 10,
        // Fail fast instead of piling up requests when the database is unreachable.
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 30_000,
        // Guards against runaway queries from the API (docs/ERROR_HANDLING.md §4).
        statement_timeout: options.statementTimeoutMs ?? 5_000,
      }),
    }),
  });
}

/** Migrations are schema-agnostic by nature, hence `Kysely<any>` (same as Kysely's own types). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDb = Kysely<any>;

export function createMigrator(db: AnyDb): Migrator {
  return new Migrator({ db, provider: { getMigrations: async () => migrations } });
}

export async function migrateToLatest(db: AnyDb): Promise<string[]> {
  const { error, results } = await createMigrator(db).migrateToLatest();
  const failed = results?.find((r) => r.status === 'Error');
  if (error || failed) {
    throw new Error(`Migration failed${failed ? ` at ${failed.migrationName}` : ''}`, {
      cause: error,
    });
  }
  return (results ?? []).map((r) => r.migrationName);
}

/** True when every known migration has been applied (used by the readiness probe). */
export async function hasPendingMigrations(db: AnyDb): Promise<boolean> {
  const infos = await createMigrator(db).getMigrations();
  return infos.some((m) => m.executedAt === undefined);
}
