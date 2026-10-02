import { ApiError } from '../errors';
import type { MawjoodApi } from '../types';
import { createDemoApi, DEMO_SEEDED_PICKUP_CODES } from './index';

const OFFER_LAST_UNIT = '00000000-0000-4000-8000-000000000403'; // seeded with quantity 1
const OFFER_MULTI = '00000000-0000-4000-8000-000000000404'; // seeded with quantity 6, max 2/order
const MERCHANT_STORE = '00000000-0000-4000-8000-000000000201';

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'OK';
  } catch (error) {
    return error instanceof ApiError ? error.code : 'UNKNOWN';
  }
}

async function signedIn(): Promise<MawjoodApi> {
  const api = createDemoApi({ latencyMs: 0 });
  await api.login({ email: 'demo@mawjood.test', password: 'x' });
  return api;
}

describe('demo adapter mirrors the documented rules', () => {
  it('requires sign-in to reserve', async () => {
    const api = createDemoApi({ latencyMs: 0 });
    expect(await codeOf(api.createOrder({ offerId: OFFER_MULTI, quantity: 1 }, 'k1'))).toBe(
      'AUTH_REQUIRED',
    );
  });

  it('sells the last unit exactly once', async () => {
    const api = await signedIn();
    const results = await Promise.all([
      codeOf(api.createOrder({ offerId: OFFER_LAST_UNIT, quantity: 1 }, 'a')),
      codeOf(api.createOrder({ offerId: OFFER_LAST_UNIT, quantity: 1 }, 'b')),
      codeOf(api.createOrder({ offerId: OFFER_LAST_UNIT, quantity: 1 }, 'c')),
    ]);
    expect(results.filter((r) => r === 'OK')).toHaveLength(1);
    expect(results.filter((r) => r === 'OFFER_SOLD_OUT')).toHaveLength(2);
  });

  it('replays the same response for the same idempotency key (one order only)', async () => {
    const api = await signedIn();
    const first = await api.createOrder({ offerId: OFFER_MULTI, quantity: 1 }, 'same-key');
    const second = await api.createOrder({ offerId: OFFER_MULTI, quantity: 1 }, 'same-key');
    expect(second.id).toBe(first.id);
    const offer = await api.getOffer(OFFER_MULTI, null);
    expect(offer.quantityAvailable).toBe(5);
  });

  it('rejects a reused key with a different body', async () => {
    const api = await signedIn();
    await api.createOrder({ offerId: OFFER_MULTI, quantity: 1 }, 'k');
    expect(await codeOf(api.createOrder({ offerId: OFFER_MULTI, quantity: 2 }, 'k'))).toBe(
      'IDEMPOTENCY_KEY_REUSED',
    );
  });

  it('enforces the per-order maximum', async () => {
    const api = await signedIn();
    expect(await codeOf(api.createOrder({ offerId: OFFER_MULTI, quantity: 3 }, 'max'))).toBe(
      'OFFER_QUANTITY_LIMIT',
    );
  });

  it('confirms a reservation immediately with a pickup pass, paid at pickup', async () => {
    const api = await signedIn();
    const order = await api.createOrder({ offerId: OFFER_MULTI, quantity: 1 }, 'reserve');
    expect(['CONFIRMED', 'READY_FOR_PICKUP']).toContain(order.status);
    expect(order.paymentMethod).toBe('PAY_AT_PICKUP');
    expect(order.pickupPass?.code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('releases stock when a reservation is cancelled', async () => {
    const api = await signedIn();
    const order = await api.createOrder({ offerId: OFFER_MULTI, quantity: 2 }, 'cancel');
    expect((await api.getOffer(OFFER_MULTI, null)).quantityAvailable).toBe(4);
    await api.cancelOrder(order.id, {}, 'c1');
    expect((await api.getOffer(OFFER_MULTI, null)).quantityAvailable).toBe(6);
  });

  it('validates a pickup once; a second scan reports already collected', async () => {
    const api = await signedIn();
    const code = DEMO_SEEDED_PICKUP_CODES[0];
    const first = await api.validatePickup({ code, locationId: MERCHANT_STORE }, 's1');
    expect(first.result).toBe('VALIDATED');
    expect(await codeOf(api.validatePickup({ code, locationId: MERCHANT_STORE }, 's2'))).toBe(
      'PICKUP_ALREADY_COMPLETED',
    );
    // A network retry with the same key replays the original success.
    const replay = await api.validatePickup({ code, locationId: MERCHANT_STORE }, 's1');
    expect(replay.validatedAt).toBe(first.validatedAt);
  });

  it('rejects unknown codes', async () => {
    const api = await signedIn();
    expect(
      await codeOf(api.validatePickup({ code: 'ZZZZZZ', locationId: MERCHANT_STORE }, 'x')),
    ).toBe('PICKUP_CODE_INVALID');
  });

  it('never invents a CO2e number', async () => {
    const api = await signedIn();
    const impact = await api.getImpact();
    expect(impact.co2eKg).toBeNull();
    expect(impact.methodology).toBeNull();
  });
});
