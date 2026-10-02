import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import type { TestProject } from 'vitest/node';

import { createDb, migrateToLatest } from '../src/database/db.ts';

export const TEMPLATE_DB = 'mawjood_template';

declare module 'vitest' {
  export interface ProvidedContext {
    /** Connection URL of the server's maintenance database (used to clone the template). */
    pgAdminUrl: string;
    redisUrl: string;
  }
}

/**
 * Starts real PostgreSQL+PostGIS and Redis once per test run and migrates a template database.
 * Each test file then clones the template (test/support/app.ts), so files never share state.
 */
export default async function setup(project: TestProject) {
  let pg: StartedPostgreSqlContainer | undefined;
  let redis: StartedRedisContainer | undefined;
  try {
    [pg, redis] = await Promise.all([
      new PostgreSqlContainer('postgis/postgis:18-3.6')
        .withDatabase(TEMPLATE_DB)
        .withUsername('test')
        .withPassword('test')
        .start(),
      new RedisContainer('redis:8.8-alpine').start(),
    ]);

    const template = createDb(pg.getConnectionUri(), { poolMax: 1, statementTimeoutMs: 120_000 });
    await migrateToLatest(template);
    await template.destroy();

    const admin = new URL(pg.getConnectionUri());
    admin.pathname = '/postgres';
    project.provide('pgAdminUrl', admin.toString());
    project.provide('redisUrl', redis.getConnectionUrl());
  } catch (error) {
    await Promise.allSettled([pg?.stop(), redis?.stop()]);
    throw error;
  }

  return async () => {
    await Promise.allSettled([pg?.stop(), redis?.stop()]);
  };
}
