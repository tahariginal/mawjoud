import 'reflect-metadata';

import { randomUUID } from 'node:crypto';

import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import pg from 'pg';
import request from 'supertest';
import { inject } from 'vitest';

import { AppModule } from '../../src/app.module.ts';
import { configureApp } from '../../src/bootstrap.ts';
import { type AppConfig, loadConfig } from '../../src/config/config.ts';
import { DB, type Db } from '../../src/database/db.ts';

const TEMPLATE_DB = 'mawjood_template';

/** Clones the migrated template into a fresh database for one test file. */
export async function createTestDatabase(): Promise<string> {
  const adminUrl = inject('pgAdminUrl');
  const name = `t_${randomUUID().replace(/-/g, '')}`;
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try {
    // Serialise clones: CREATE DATABASE ... TEMPLATE fails if the template is in use concurrently.
    await client.query('SELECT pg_advisory_lock(424242)');
    await client.query(`CREATE DATABASE "${name}" TEMPLATE "${TEMPLATE_DB}"`);
  } finally {
    await client.query('SELECT pg_advisory_unlock(424242)').catch(() => undefined);
    await client.end();
  }
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

export type TestContext = {
  app: NestExpressApplication;
  http: () => ReturnType<typeof request>;
  db: Db;
  config: AppConfig;
  close: () => Promise<void>;
};

type Overrides = { provide: unknown; useValue: unknown }[];

/** Boots the full application against an isolated database (no mocks of our own code). */
export async function createTestApp(overrides: Overrides = []): Promise<TestContext> {
  const databaseUrl = await createTestDatabase();
  const config: AppConfig = {
    ...loadConfig({
      APP_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: databaseUrl,
      REDIS_URL: inject('redisUrl'),
    }),
    // Separate Redis key space per test file.
    redisKeyPrefix: `test:${randomUUID()}:`,
  };

  let builder = Test.createTestingModule({ imports: [AppModule.forRoot(config)] });
  for (const o of overrides) builder = builder.overrideProvider(o.provide).useValue(o.useValue);
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
  configureApp(app, config);
  await app.init();

  const server = app.getHttpServer();
  return {
    app,
    http: () => request(server),
    db: app.get<Db>(DB),
    config,
    close: () => app.close(),
  };
}
