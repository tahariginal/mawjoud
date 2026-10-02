import { randomUUID } from 'node:crypto';

import { Order } from '@mawjood/contracts';

import { TokenService } from '../../src/shared/security/token.service.ts';
import type { TestContext } from './app.ts';

export type FastUser = { id: string; auth: { Authorization: string } };

/**
 * Creates verified customers directly in the database and signs access tokens with the app's own
 * key (the guard only verifies the JWT). Used by concurrency tests that need many users quickly;
 * registration itself is covered by identity.test.ts.
 */
export async function createVerifiedUsers(t: TestContext, count: number): Promise<FastUser[]> {
  const tokens = t.app.get(TokenService);
  const rows = await t.db
    .insertInto('users')
    .values(
      Array.from({ length: count }, (_, i) => ({
        email: `bulk.${randomUUID().slice(0, 8)}.${i}@example.test`,
        display_name: `Buyer ${i}`,
        email_verified_at: new Date(),
      })),
    )
    .returning('id')
    .execute();
  return Promise.all(
    rows.map(async (r) => {
      const { token } = await tokens.signAccess({
        userId: r.id,
        sessionId: randomUUID(),
        role: 'CUSTOMER',
      });
      return { id: r.id, auth: { Authorization: `Bearer ${token}` } };
    }),
  );
}

export function reserve(
  t: TestContext,
  user: { auth: { Authorization: string } },
  offerId: string,
  quantity = 1,
  key: string = randomUUID(),
) {
  return t
    .http()
    .post('/api/v1/orders')
    .set(user.auth)
    .set('Idempotency-Key', key)
    .send({ offerId, quantity });
}

export async function reserveOk(
  t: TestContext,
  user: { auth: { Authorization: string } },
  offerId: string,
  quantity = 1,
): Promise<Order> {
  const res = await reserve(t, user, offerId, quantity).expect(201);
  return Order.parse(res.body);
}

export function validatePickup(
  t: TestContext,
  staff: { auth: { Authorization: string } },
  body: object,
  key: string = randomUUID(),
) {
  return t
    .http()
    .post('/api/v1/pickups/validate')
    .set(staff.auth)
    .set('Idempotency-Key', key)
    .send(body);
}
