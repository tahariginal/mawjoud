import { ApiErrorEnvelope, AppConfig, Category } from '@mawjood/contracts';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { SCHEMA_COLUMNS } from '../src/database/schema.ts';
import { createTestApp, type TestContext } from './support/app.ts';

let t: TestContext;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});

describe('health', () => {
  it('reports liveness', async () => {
    const res = await t.http().get('/health/live').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('reports readiness of database, redis and migrations', async () => {
    const res = await t.http().get('/health/ready').expect(200);
    expect(res.body).toEqual({
      status: 'ok',
      checks: { database: 'ok', redis: 'ok', migrations: 'ok' },
    });
  });
});

describe('platform endpoints', () => {
  it('returns app config matching the contract', async () => {
    const res = await t.http().get('/api/v1/app-config').expect(200);
    expect(AppConfig.parse(res.body).minSupportedVersion).toBe('0.0.0');
  });

  it('returns the seeded categories in order', async () => {
    const res = await t.http().get('/api/v1/categories').expect(200);
    const categories = z.array(Category).parse(res.body);
    expect(categories.map((c) => c.slug)).toEqual([
      'bakery',
      'pastry',
      'cafe',
      'restaurant',
      'grocery',
    ]);
  });
});

describe('error envelope and request ids', () => {
  it('returns NOT_FOUND in the standard envelope with a request id', async () => {
    const res = await t.http().get('/api/v1/does-not-exist').expect(404);
    const body = ApiErrorEnvelope.parse(res.body);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toBe(res.headers['x-request-id']);
  });

  it('echoes a valid client request id', async () => {
    const id = '3b241101-e2bb-4255-8caf-4136c566a962';
    const res = await t.http().get('/health/live').set('X-Request-Id', id).expect(200);
    expect(res.headers['x-request-id']).toBe(id);
  });

  it('does not leak framework details for malformed JSON', async () => {
    const res = await t
      .http()
      .post('/api/v1/app-config')
      .set('Content-Type', 'application/json')
      .send('{"broken":')
      .expect((r) => expect([400, 404]).toContain(r.status));
    const body = ApiErrorEnvelope.parse(res.body);
    expect(JSON.stringify(body)).not.toMatch(/Unexpected|SyntaxError|stack/i);
  });

  it('sets security headers', async () => {
    const res = await t.http().get('/health/live');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('database schema', () => {
  it('matches the TypeScript schema exactly (no drift)', async () => {
    const rows = await sql<{ table_name: string; column_name: string }>`
      select c.table_name, c.column_name
      from information_schema.columns c
      join information_schema.tables t
        on t.table_schema = c.table_schema and t.table_name = c.table_name
      where c.table_schema = 'public'
        and t.table_type = 'BASE TABLE'
        and c.table_name not like 'kysely_%'
        and c.table_name <> 'spatial_ref_sys'
    `.execute(t.db);
    const actual: Record<string, string[]> = {};
    for (const r of rows.rows) (actual[r.table_name] ??= []).push(r.column_name);
    const expected = Object.fromEntries(
      Object.entries(SCHEMA_COLUMNS).map(([table, cols]) => [table, [...cols].map(String).sort()]),
    );
    const actualSorted = Object.fromEntries(
      Object.entries(actual).map(([table, cols]) => [table, cols.sort()]),
    );
    expect(actualSorted).toEqual(expected);
  });

  it('rejects inventory that would go negative (database backstop)', async () => {
    await expect(
      sql`insert into offer_inventory (offer_id, quantity_total, quantity_available)
          values (gen_random_uuid(), 1, -1)`.execute(t.db),
    ).rejects.toThrow();
  });
});
