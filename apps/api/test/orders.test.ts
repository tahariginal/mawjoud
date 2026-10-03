import { randomUUID } from 'node:crypto';

import {
  ApiErrorEnvelope,
  ImpactSummary,
  MerchantInsights,
  MerchantOrder,
  OfferDetail,
  Order,
  pageOf,
  PickupValidateResult,
  Quote,
} from '@mazal/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createTestApp, type TestContext } from './support/app.ts';
import {
  createAdmin,
  createMerchant,
  createOffer,
  type TestMerchant,
} from './support/merchants.ts';
import { createVerifiedUsers, reserve, reserveOk, validatePickup } from './support/orders.ts';
import { registerUser, type TestUser } from './support/users.ts';

const OrderPage = pageOf(Order);
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

let t: TestContext;
let admin: TestUser;
let shop: TestMerchant;
let other: TestMerchant;

const errorOf = (body: unknown) => ApiErrorEnvelope.parse(body).error;
const stock = async (offerId: string) =>
  (
    await t.db
      .selectFrom('offer_inventory')
      .select('quantity_available')
      .where('offer_id', '=', offerId)
      .executeTakeFirstOrThrow()
  ).quantity_available;

/** Offer whose pickup window is already open (orders become READY_FOR_PICKUP immediately). */
const openNow = () => ({
  pickupStart: new Date(Date.now() - 10 * MINUTE).toISOString(),
  pickupEnd: new Date(Date.now() + HOUR).toISOString(),
});

beforeAll(async () => {
  t = await createTestApp();
  admin = await createAdmin(t);
  shop = await createMerchant(t, { admin, name: 'Shop A' });
  other = await createMerchant(t, { admin, name: 'Shop B', point: { lat: 33.59, lng: -7.62 } });
});
afterAll(async () => {
  await t.close();
});

describe('reservations: inventory correctness', () => {
  it('CS-1: 50 concurrent buyers, last unit — exactly one succeeds', async () => {
    const offer = await createOffer(t, shop, { quantity: 1, maxPerOrder: 1 });
    const buyers = await createVerifiedUsers(t, 50);
    const results = await Promise.all(buyers.map((b) => reserve(t, b, offer.id)));
    const ok = results.filter((r) => r.status === 201);
    const soldOut = results.filter(
      (r) => r.status === 409 && errorOf(r.body).code === 'OFFER_SOLD_OUT',
    );
    expect(ok).toHaveLength(1);
    expect(soldOut).toHaveLength(49);
    expect(await stock(offer.id)).toBe(0);
  });

  it('CS-2: 10 units, 30 concurrent buyers — exactly ten orders', async () => {
    const offer = await createOffer(t, shop, { quantity: 10, maxPerOrder: 1 });
    const buyers = await createVerifiedUsers(t, 30);
    const results = await Promise.all(buyers.map((b) => reserve(t, b, offer.id)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(10);
    expect(await stock(offer.id)).toBe(0);
    const orders = await t.db
      .selectFrom('order_items')
      .select('order_id')
      .where('offer_id', '=', offer.id)
      .execute();
    expect(orders).toHaveLength(10);
  });

  it('confirms a reservation immediately, priced by the server, with a pickup pass', async () => {
    const offer = await createOffer(t, shop, { priceMinor: 3500, quantity: 5 });
    const [buyer] = await createVerifiedUsers(t, 1);
    const quote = Quote.parse(
      (
        await t
          .http()
          .post('/api/v1/orders/quote')
          .set(buyer!.auth)
          .send({ offerId: offer.id, quantity: 2 })
          .expect(200)
      ).body,
    );
    expect(quote.breakdown.total).toEqual({ amountMinor: 7000, currency: 'MAD' });

    const res = await t
      .http()
      .post('/api/v1/orders')
      .set(buyer!.auth)
      .set('Idempotency-Key', randomUUID())
      .send({ offerId: offer.id, quantity: 2, quoteVersion: quote.quoteVersion })
      .expect(201);
    const order = Order.parse(res.body);
    expect(order).toMatchObject({
      status: 'CONFIRMED',
      paymentMethod: 'PAY_AT_PICKUP',
      cancellable: true,
    });
    expect(order.breakdown.total.amountMinor).toBe(7000);
    expect(order.pickupPass?.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(await stock(offer.id)).toBe(3);
  });

  it('rejects stale prices, quantities above the limit, paused offers and unverified accounts', async () => {
    const offer = await createOffer(t, shop, { maxPerOrder: 2 });
    const [buyer] = await createVerifiedUsers(t, 1);
    const stale = await t
      .http()
      .post('/api/v1/orders')
      .set(buyer!.auth)
      .set('Idempotency-Key', randomUUID())
      .send({ offerId: offer.id, quantity: 1, quoteVersion: 'v1:1:MAD' })
      .expect(409);
    expect(errorOf(stale.body).code).toBe('PRICE_CHANGED');

    const tooMany = await reserve(t, buyer!, offer.id, 3).expect(422);
    expect(errorOf(tooMany.body).code).toBe('OFFER_QUANTITY_LIMIT');

    await t
      .http()
      .post(`/api/v1/merchant/offers/${offer.id}/pause`)
      .set(shop.owner.auth)
      .expect(200);
    const paused = await reserve(t, buyer!, offer.id).expect(409);
    expect(errorOf(paused.body).code).toBe('OFFER_NOT_AVAILABLE');

    const unverified = await registerUser(t, { verified: false });
    const resumed = await createOffer(t, shop);
    const res = await reserve(t, unverified, resumed.id).expect(403);
    expect(errorOf(res.body).code).toBe('AUTH_EMAIL_NOT_VERIFIED');
  });

  it('requires a valid Idempotency-Key header', async () => {
    const offer = await createOffer(t, shop);
    const [buyer] = await createVerifiedUsers(t, 1);
    await t
      .http()
      .post('/api/v1/orders')
      .set(buyer!.auth)
      .send({ offerId: offer.id, quantity: 1 })
      .expect(400);
    await t
      .http()
      .post('/api/v1/orders')
      .set(buyer!.auth)
      .set('Idempotency-Key', 'short')
      .send({ offerId: offer.id, quantity: 1 })
      .expect(400);
  });
});

describe('reservations: idempotency (ADR-005)', () => {
  it('CS-3: the same request twice (sequential and concurrent) creates one order', async () => {
    const offer = await createOffer(t, shop, { quantity: 5 });
    const [buyer] = await createVerifiedUsers(t, 1);
    const key = randomUUID();
    const first = Order.parse((await reserve(t, buyer!, offer.id, 1, key).expect(201)).body);
    const again = Order.parse((await reserve(t, buyer!, offer.id, 1, key).expect(201)).body);
    expect(again.id).toBe(first.id);

    const concurrentKey = randomUUID();
    const burst = await Promise.all(
      Array.from({ length: 5 }, () => reserve(t, buyer!, offer.id, 1, concurrentKey)),
    );
    const ids = new Set(burst.filter((r) => r.status === 201).map((r) => Order.parse(r.body).id));
    expect(ids.size).toBe(1);
    expect(await stock(offer.id)).toBe(3);
  });

  it('CS-4: the same key with a different body is rejected', async () => {
    const offer = await createOffer(t, shop, { quantity: 5 });
    const [buyer] = await createVerifiedUsers(t, 1);
    const key = randomUUID();
    await reserve(t, buyer!, offer.id, 1, key).expect(201);
    const res = await reserve(t, buyer!, offer.id, 2, key).expect(409);
    expect(errorOf(res.body).code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await stock(offer.id)).toBe(4);
  });

  it('a failed attempt does not burn the key', async () => {
    const offer = await createOffer(t, shop, { quantity: 1 });
    const [a, b] = await createVerifiedUsers(t, 2);
    await reserve(t, a!, offer.id).expect(201);
    const key = randomUUID();
    await reserve(t, b!, offer.id, 1, key).expect(409);
    // Stock comes back (A cancels): the same key can now succeed.
    const order = await t.db
      .selectFrom('orders')
      .select('id')
      .where('user_id', '=', a!.id)
      .executeTakeFirstOrThrow();
    await t.http().post(`/api/v1/orders/${order.id}/cancel`).set(a!.auth).send({}).expect(200);
    await reserve(t, b!, offer.id, 1, key).expect(201);
  });
});

describe('reservations: anti-hoarding (ADR-015)', () => {
  it('caps active reservations per user, even under concurrent requests', async () => {
    const offer = await createOffer(t, shop, { quantity: 20, maxPerOrder: 1 });
    const [buyer] = await createVerifiedUsers(t, 1);
    const results = await Promise.all(
      Array.from({ length: 6 }, () => reserve(t, buyer!, offer.id)),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(3);
    const limited = results.filter((r) => r.status === 409);
    expect(limited.every((r) => errorOf(r.body).code === 'ORDER_LIMIT_REACHED')).toBe(true);
    expect(await stock(offer.id)).toBe(17);
  });
});

describe('cancellation, history and access control', () => {
  it('cancels before the window (stock back, idempotent) but not after it opens', async () => {
    const offer = await createOffer(t, shop, { quantity: 2 });
    const [buyer] = await createVerifiedUsers(t, 1);
    const order = await reserveOk(t, buyer!, offer.id, 2);
    const cancelled = Order.parse(
      (
        await t
          .http()
          .post(`/api/v1/orders/${order.id}/cancel`)
          .set(buyer!.auth)
          .send({ reason: 'Plans changed' })
          .expect(200)
      ).body,
    );
    expect(cancelled).toMatchObject({
      status: 'CANCELLED',
      cancelledReason: 'Plans changed',
      pickupPass: null,
    });
    expect(await stock(offer.id)).toBe(2);
    await t.http().post(`/api/v1/orders/${order.id}/cancel`).set(buyer!.auth).send({}).expect(200);
    expect(await stock(offer.id)).toBe(2);

    const live = await createOffer(t, shop, openNow());
    const ready = await reserveOk(t, buyer!, live.id);
    expect(ready.status).toBe('READY_FOR_PICKUP');
    expect(ready.cancellable).toBe(false);
    const res = await t
      .http()
      .post(`/api/v1/orders/${ready.id}/cancel`)
      .set(buyer!.auth)
      .send({})
      .expect(409);
    expect(errorOf(res.body).code).toBe('ORDER_CANCELLATION_CLOSED');
  });

  it('CS-18: customers cannot see or cancel other customers’ orders', async () => {
    const offer = await createOffer(t, shop);
    const [owner, intruder] = await createVerifiedUsers(t, 2);
    const order = await reserveOk(t, owner!, offer.id);
    await t.http().get(`/api/v1/orders/${order.id}`).set(intruder!.auth).expect(404);
    await t
      .http()
      .post(`/api/v1/orders/${order.id}/cancel`)
      .set(intruder!.auth)
      .send({})
      .expect(404);
  });

  it('lists upcoming and past orders with cursor pagination', async () => {
    const offer = await createOffer(t, shop, { quantity: 10, maxPerOrder: 1 });
    const [buyer] = await createVerifiedUsers(t, 1);
    const orders = [await reserveOk(t, buyer!, offer.id), await reserveOk(t, buyer!, offer.id)];
    await t
      .http()
      .post(`/api/v1/orders/${orders[0]!.id}/cancel`)
      .set(buyer!.auth)
      .send({})
      .expect(200);
    const upcoming = OrderPage.parse(
      (await t.http().get('/api/v1/orders?status=upcoming').set(buyer!.auth).expect(200)).body,
    );
    expect(upcoming.data.map((o) => o.id)).toEqual([orders[1]!.id]);
    const past = OrderPage.parse(
      (await t.http().get('/api/v1/orders?status=past').set(buyer!.auth).expect(200)).body,
    );
    expect(past.data.map((o) => o.status)).toEqual(['CANCELLED']);
  });

  it('records the status history of every transition', async () => {
    const offer = await createOffer(t, shop);
    const [buyer] = await createVerifiedUsers(t, 1);
    const order = await reserveOk(t, buyer!, offer.id);
    await t.http().post(`/api/v1/orders/${order.id}/cancel`).set(buyer!.auth).send({}).expect(200);
    const history = await t.db
      .selectFrom('order_status_history')
      .select(['from_status', 'to_status', 'actor_type'])
      .where('order_id', '=', order.id)
      .orderBy('created_at')
      .orderBy('id')
      .execute();
    expect(history.map((h) => `${h.from_status ?? '-'}>${h.to_status}`)).toEqual([
      '->CREATED',
      'CREATED>CONFIRMED',
      'CONFIRMED>CANCELLED',
    ]);
  });
});

describe('pickup validation (ADR-012)', () => {
  it('CS-10: the same pass scanned twice — one pickup; a retry with the same key replays', async () => {
    const offer = await createOffer(t, shop, openNow());
    const [buyer] = await createVerifiedUsers(t, 1);
    const order = await reserveOk(t, buyer!, offer.id);
    const token = order.pickupPass!.token;

    const key = randomUUID();
    const first = PickupValidateResult.parse(
      (await validatePickup(t, shop.owner, { token }, key).expect(200)).body,
    );
    expect(first.order.status).toBe('PICKED_UP');
    const replay = PickupValidateResult.parse(
      (await validatePickup(t, shop.owner, { token }, key).expect(200)).body,
    );
    expect(replay.validatedAt).toBe(first.validatedAt);

    const second = await validatePickup(t, shop.owner, { token }).expect(409);
    expect(errorOf(second.body).code).toBe('PICKUP_ALREADY_COMPLETED');
    expect(errorOf(second.body).details?.pickedUpAt).toBe(first.validatedAt);
  });

  it('CS-10 (concurrent): two devices scan at once — exactly one succeeds', async () => {
    const offer = await createOffer(t, shop, openNow());
    const [buyer] = await createVerifiedUsers(t, 1);
    const order = await reserveOk(t, buyer!, offer.id);
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        validatePickup(t, shop.owner, { token: order.pickupPass!.token }),
      ),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    const pickups = await t.db
      .selectFrom('pickups')
      .select('id')
      .where('order_id', '=', order.id)
      .execute();
    expect(pickups).toHaveLength(1);
  });

  it('validates by short code at the right store, by staff too', async () => {
    const offer = await createOffer(t, shop, openNow());
    const [buyer] = await createVerifiedUsers(t, 1);
    const staff = await registerUser(t, { displayName: 'Counter staff' });
    await t
      .http()
      .post(`/api/v1/merchant/businesses/${shop.businessId}/members`)
      .set(shop.owner.auth)
      .send({ email: staff.email })
      .expect(204);
    const order = await reserveOk(t, buyer!, offer.id);
    const res = PickupValidateResult.parse(
      (
        await validatePickup(t, staff, {
          code: order.pickupPass!.code,
          locationId: shop.locationId,
        }).expect(200)
      ).body,
    );
    expect(res.order).toMatchObject({ id: order.id, quantity: 1, customerInitial: 'B' });
  });

  it('CS-11: another store cannot validate (or learn about) the pass', async () => {
    const offer = await createOffer(t, shop, openNow());
    const [buyer] = await createVerifiedUsers(t, 1);
    const order = await reserveOk(t, buyer!, offer.id);
    const byToken = await validatePickup(t, other.owner, { token: order.pickupPass!.token }).expect(
      404,
    );
    expect(errorOf(byToken.body).code).toBe('PICKUP_CODE_INVALID');
    const byCode = await validatePickup(t, other.owner, {
      code: order.pickupPass!.code,
      locationId: shop.locationId,
    }).expect(404);
    expect(errorOf(byCode.body).code).toBe('PICKUP_CODE_INVALID');
    const customer = await validatePickup(t, buyer!, { token: order.pickupPass!.token }).expect(
      404,
    );
    expect(errorOf(customer.body).code).toBe('PICKUP_CODE_INVALID');
  });

  it('CS-12: cancelled orders, early scans and forged tokens are refused', async () => {
    const [buyer] = await createVerifiedUsers(t, 1);
    const future = await createOffer(t, shop);
    const early = await reserveOk(t, buyer!, future.id);
    const notYet = await validatePickup(t, shop.owner, { token: early.pickupPass!.token }).expect(
      409,
    );
    expect(errorOf(notYet.body).code).toBe('PICKUP_NOT_YET_OPEN');

    const tokenBefore = early.pickupPass!.token;
    await t.http().post(`/api/v1/orders/${early.id}/cancel`).set(buyer!.auth).send({}).expect(200);
    const cancelled = await validatePickup(t, shop.owner, { token: tokenBefore }).expect(409);
    expect(errorOf(cancelled.body).code).toBe('PICKUP_ORDER_CANCELLED');

    const forged = `${early.id}.${'A'.repeat(43)}`;
    const res = await validatePickup(t, shop.owner, { token: forged }).expect(404);
    expect(errorOf(res.body).code).toBe('PICKUP_CODE_INVALID');
  });

  it('locks code entry for a store after repeated invalid codes', async () => {
    const shopC = await createMerchant(t, { admin, name: 'Shop C' });
    for (let i = 0; i < 10; i += 1) {
      await validatePickup(t, shopC.owner, { code: 'ZZZZZZ', locationId: shopC.locationId }).expect(
        404,
      );
    }
    const locked = await validatePickup(t, shopC.owner, {
      code: 'ZZZZZZ',
      locationId: shopC.locationId,
    }).expect(429);
    expect(errorOf(locked.body).code).toBe('RATE_LIMITED');
  });

  it('outsiders cannot trigger a store’s lockout', async () => {
    const shopD = await createMerchant(t, { admin, name: 'Shop D' });
    const [outsider] = await createVerifiedUsers(t, 1);
    for (let i = 0; i < 12; i += 1) {
      await validatePickup(t, outsider!, { code: 'ZZZZZZ', locationId: shopD.locationId }).expect(
        404,
      );
    }
    await validatePickup(t, shopD.owner, { code: 'ZZZZZZ', locationId: shopD.locationId }).expect(
      404,
    );
  });
});

describe('after pickup: merchant views, reviews and impact', () => {
  it('shows today’s pickups, insights, rating and the customer’s impact', async () => {
    const offer = await createOffer(t, other, {
      ...openNow(),
      priceMinor: 3000,
      referenceValueMinor: 8000,
      quantity: 3,
    });
    const buyer = await registerUser(t, { displayName: 'zineb' });
    const order = Order.parse((await reserve(t, buyer, offer.id, 2).expect(201)).body);

    const today = z
      .array(MerchantOrder)
      .parse(
        (
          await t
            .http()
            .get(`/api/v1/merchant/orders?locationId=${other.locationId}`)
            .set(other.owner.auth)
            .expect(200)
        ).body,
      );
    expect(today.find((o) => o.id === order.id)).toMatchObject({
      customerInitial: 'Z',
      quantity: 2,
      status: 'READY_FOR_PICKUP',
    });

    await t
      .http()
      .post(`/api/v1/orders/${order.id}/review`)
      .set(buyer.auth)
      .send({ rating: 5 })
      .expect(409);
    await validatePickup(t, other.owner, { token: order.pickupPass!.token }).expect(200);

    const insights = MerchantInsights.parse(
      (
        await t
          .http()
          .get(`/api/v1/merchant/insights?businessId=${other.businessId}`)
          .set(other.owner.auth)
          .expect(200)
      ).body,
    );
    expect(insights).toMatchObject({
      ordersCompleted: 1,
      itemsRescued: 2,
      revenue: { amountMinor: 6000, currency: 'MAD' },
    });

    await t
      .http()
      .post(`/api/v1/orders/${order.id}/review`)
      .set(buyer.auth)
      .send({ rating: 4, comment: 'Great bread' })
      .expect(204);
    await t
      .http()
      .post(`/api/v1/orders/${order.id}/review`)
      .set(buyer.auth)
      .send({ rating: 1 })
      .expect(409);
    const detail = OfferDetail.parse(
      (await t.http().get(`/api/v1/offers/${offer.id}`).expect(200)).body,
    );
    expect(detail.rating).toEqual({ average: 4, count: 1 });

    const impact = ImpactSummary.parse(
      (await t.http().get('/api/v1/me/impact').set(buyer.auth).expect(200)).body,
    );
    expect(impact).toMatchObject({
      ordersCompleted: 1,
      itemsRescued: 2,
      moneySaved: { amountMinor: 10000, currency: 'MAD' },
      co2eKg: null,
    });

    const after = Order.parse(
      (await t.http().get(`/api/v1/orders/${order.id}`).set(buyer.auth).expect(200)).body,
    );
    expect(after).toMatchObject({ status: 'PICKED_UP', pickupPass: null, reviewable: false });
  });

  it('customers and other merchants cannot read a store’s orders or insights', async () => {
    const [customer] = await createVerifiedUsers(t, 1);
    await t
      .http()
      .get(`/api/v1/merchant/orders?locationId=${shop.locationId}`)
      .set(customer!.auth)
      .expect(404);
    await t
      .http()
      .get(`/api/v1/merchant/insights?businessId=${shop.businessId}`)
      .set(other.owner.auth)
      .expect(404);
  });
});

describe('account deletion', () => {
  it('cancels open reservations and returns the stock', async () => {
    const offer = await createOffer(t, shop, { quantity: 3 });
    const buyer = await registerUser(t);
    await reserveOk(t, buyer, offer.id, 2);
    expect(await stock(offer.id)).toBe(1);
    await t
      .http()
      .delete('/api/v1/me')
      .set(buyer.auth)
      .send({ password: buyer.password })
      .expect(204);
    expect(await stock(offer.id)).toBe(3);
    const statuses = await t.db
      .selectFrom('orders')
      .select('status')
      .where('user_id', '=', buyer.id)
      .execute();
    expect(statuses.map((s) => s.status)).toEqual(['CANCELLED']);
  });
});
