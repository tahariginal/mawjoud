import { ApiErrorEnvelope } from '@mawjood/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp, type TestContext } from './support/app.ts';
import { uniqueEmail } from './support/users.ts';

let t: TestContext;

beforeAll(async () => {
  t = await createTestApp({ env: { RATE_LIMITS_ENABLED: 'true' } });
});
afterAll(async () => {
  await t.close();
});

describe('rate limits (Redis-backed)', () => {
  it('blocks the 6th login attempt for one email within a minute', async () => {
    const email = uniqueEmail('ratelimit');
    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      const res = await t
        .http()
        .post('/api/v1/auth/login')
        .send({ email, password: 'wrong-password!' });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });

  it('keeps separate budgets per email (no cross-account lockout)', async () => {
    const res = await t
      .http()
      .post('/api/v1/auth/login')
      .send({ email: uniqueEmail('other'), password: 'wrong-password!' });
    expect(res.status).toBe(401);
  });

  it('answers 429 with the standard envelope and Retry-After', async () => {
    const email = uniqueEmail('envelope');
    let last;
    for (let i = 0; i < 6; i += 1) {
      last = await t.http().post('/api/v1/auth/login').send({ email, password: 'wrong-password!' });
    }
    expect(last?.status).toBe(429);
    expect(ApiErrorEnvelope.parse(last?.body).error.code).toBe('RATE_LIMITED');
    expect(Number(last?.headers['retry-after'])).toBeGreaterThan(0);
  });
});
