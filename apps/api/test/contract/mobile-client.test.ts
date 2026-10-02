/**
 * Contract test: the mobile app's real HTTP client (apps/mobile/src/api/http.ts) against the real
 * API. The client validates every response with the shared Zod contracts, so any drift in paths,
 * query strings, bodies or response shapes fails here. Only native modules are stubbed.
 *
 * Excluded from the API's tsc project (it imports mobile sources); the mobile app typechecks them.
 */
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: async (key) => store.get(key) ?? null,
    setItemAsync: async (key, value) => void store.set(key, value),
    deleteItemAsync: async (key) => void store.delete(key),
  };
});
vi.mock('@/config/env', () => ({
  env: {
    appEnv: 'test',
    apiMode: 'http',
    apiBaseUrl: '',
    appVersion: '0.1.0',
    googleMapsAndroidConfigured: false,
  },
}));
vi.mock('@/lib/ids', () => ({ newUuid: () => randomUUID() }));

const { createHttpApi } = await import('@/api/http');
const { ApiError } = await import('@/api/errors');

import { createTestApp } from '../support/app.ts';
import { categoryId, createAdmin, STORE_POINT } from '../support/merchants.ts';

let t;
const HOUR = 3_600_000;
const PASSWORD = 'correct-horse-battery';

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});

async function signUp(client, displayName) {
  const email = `${displayName.toLowerCase()}.${randomUUID().slice(0, 8)}@example.test`;
  const result = await client.register({ email, password: PASSWORD, displayName, locale: 'en' });
  expect(result.me.emailVerified).toBe(false);
  const me = await client.verifyEmail({ code: t.email.lastCode(email) });
  expect(me.emailVerified).toBe(true);
  return { email, me };
}

describe('mobile HttpApi ↔ API', () => {
  it('runs every screen’s calls through the real client', async () => {
    const base = `${t.baseUrl}/api/v1`;
    const merchant = createHttpApi(base);
    const customer = createHttpApi(base);

    // Platform
    expect((await customer.getAppConfig()).minSupportedVersion).toBe('0.0.0');
    const categories = await customer.listCategories();
    const bakery = categories.find((c) => c.slug === 'bakery');
    expect(bakery).toBeDefined();

    // Merchant onboarding → admin approval → offers
    const owner = await signUp(merchant, 'Owner');
    await merchant.submitMerchantApplication({
      businessName: 'Contract Bakery',
      legalName: 'Contract Bakery SARL',
      categoryId: bakery.id,
      addressLine: 'Rue du Parc, Maarif',
      city: 'Casablanca',
      phone: '+212 522 000 000',
      contactEmail: owner.email,
      location: STORE_POINT,
    });
    const [pending] = await merchant.listMerchantBusinesses();
    expect(pending.status).toBe('PENDING_REVIEW');
    const admin = await createAdmin(t);
    await t
      .http()
      .post(`/api/v1/admin/businesses/${pending.id}/approve`)
      .set(admin.auth)
      .send({ reason: 'Documents checked' })
      .expect(204);
    const [business] = await merchant.listMerchantBusinesses();
    const locationId = business.locations[0].id;

    const input = {
      locationId,
      categoryId: await categoryId(t),
      title: 'Pastry box',
      description: 'Today’s pastries',
      quantity: 3,
      priceMinor: 3500,
      referenceValueMinor: 9000,
      pickupStart: new Date(Date.now() - 60_000).toISOString(),
      pickupEnd: new Date(Date.now() + 2 * HOUR).toISOString(),
      maxPerOrder: 2,
      allergens: ['GLUTEN'],
      dietaryTags: ['VEGETARIAN'],
    };
    const created = await merchant.createMerchantOffer(input);
    const updated = await merchant.updateMerchantOffer(
      created.id,
      { ...input, title: 'Pastry box XL' },
      created.version,
    );
    expect(updated.title).toBe('Pastry box XL');
    expect((await merchant.setMerchantOfferPaused(created.id, true)).status).toBe('PAUSED');
    expect((await merchant.setMerchantOfferPaused(created.id, false)).status).toBe('ACTIVE');
    expect((await merchant.listMerchantOffers(business.id)).map((o) => o.id)).toContain(created.id);
    expect((await merchant.getMerchantOffer(created.id)).version).toBe(updated.version + 2);

    // Customer discovery
    const buyer = await signUp(customer, 'Buyer');
    const feed = await customer.getHomeFeed(STORE_POINT);
    expect(feed.nearby.map((o) => o.id)).toContain(created.id);
    const page = await customer.listOffers({
      near: STORE_POINT,
      radiusM: 5000,
      sort: 'distance',
      limit: 20,
      categoryIds: [bakery.id],
      dietary: ['VEGETARIAN'],
      availableOnly: true,
    });
    expect(page.data.map((o) => o.id)).toContain(created.id);
    const viewport = await customer.listOffers({
      bbox: {
        minLat: STORE_POINT.lat - 0.01,
        minLng: STORE_POINT.lng - 0.01,
        maxLat: STORE_POINT.lat + 0.01,
        maxLng: STORE_POINT.lng + 0.01,
      },
      sort: 'relevance',
      limit: 20,
    });
    expect(viewport.data.map((o) => o.id)).toContain(created.id);
    expect((await customer.getOffer(created.id, STORE_POINT)).storeDetail.id).toBe(locationId);
    expect((await customer.getStore(locationId, STORE_POINT)).offers).toHaveLength(1);
    expect((await customer.search('pastry', STORE_POINT)).offers.map((o) => o.id)).toContain(
      created.id,
    );

    // Favorites
    await customer.addFavorite(locationId);
    expect((await customer.listFavorites(STORE_POINT))[0].availableOffers).toBe(1);
    await customer.removeFavorite(locationId);
    expect(await customer.listFavorites(null)).toEqual([]);

    // Reserve (pay at pickup) and collect
    const quote = await customer.quote({ offerId: created.id, quantity: 2 });
    const order = await customer.createOrder(
      { offerId: created.id, quantity: 2, quoteVersion: quote.quoteVersion },
      randomUUID(),
    );
    expect(order.paymentMethod).toBe('PAY_AT_PICKUP');
    expect((await customer.listOrders('upcoming')).data.map((o) => o.id)).toContain(order.id);
    expect((await customer.getOrder(order.id)).id).toBe(order.id);
    expect(Array.isArray(await merchant.listMerchantOrders(locationId))).toBe(true);
    const pickup = await merchant.validatePickup({ token: order.pickupPass.token }, randomUUID());
    expect(pickup.order.status).toBe('PICKED_UP');
    await customer.reviewOrder(order.id, { rating: 5, comment: 'Lovely' });
    const impact = await customer.getImpact();
    expect(impact.moneySaved.amountMinor).toBe(11000);
    expect((await merchant.getMerchantInsights(business.id)).ordersCompleted).toBe(1);

    // Errors arrive as typed ApiErrors with stable codes.
    const soldOut = await customer
      .createOrder({ offerId: created.id, quantity: 2 }, randomUUID())
      .catch((e) => e);
    expect(soldOut).toBeInstanceOf(ApiError);
    expect(['OFFER_QUANTITY_LIMIT', 'OFFER_SOLD_OUT']).toContain(soldOut.code);

    // Staff
    await merchant.inviteStaff(business.id, { email: buyer.email });
    expect((await merchant.listStaff(business.id)).map((m) => m.role).sort()).toEqual([
      'OWNER',
      'STAFF',
    ]);

    // Cancel a second reservation
    const second = await merchant.createMerchantOffer({
      ...input,
      title: 'Bread',
      pickupStart: new Date(Date.now() + HOUR).toISOString(),
      pickupEnd: new Date(Date.now() + 2 * HOUR).toISOString(),
    });
    const toCancel = await customer.createOrder({ offerId: second.id, quantity: 1 }, randomUUID());
    expect(
      (await customer.cancelOrder(toCancel.id, { reason: 'changed plans' }, randomUUID())).status,
    ).toBe('CANCELLED');
    expect((await customer.listOrders('past')).data.map((o) => o.status)).toContain('CANCELLED');

    // Account
    const prefs = await customer.getNotificationPreferences();
    expect(
      (await customer.updateNotificationPreferences({ ...prefs, maxFavoriteAlertsPerDay: 4 }))
        .maxFavoriteAlertsPerDay,
    ).toBe(4);
    expect((await customer.updateMe({ displayName: 'Buyer Renamed' })).displayName).toBe(
      'Buyer Renamed',
    );

    // Session: logout, sign in again, refresh-based restore, then delete the account.
    await customer.logout();
    await customer.login({ email: buyer.email, password: PASSWORD });
    expect((await customer.restoreSession())?.email).toBe(buyer.email);
    await customer.deleteAccount({ password: PASSWORD });
    const gone = await customer.login({ email: buyer.email, password: PASSWORD }).catch((e) => e);
    expect(gone.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('maps network failures to NETWORK_ERROR', async () => {
    const offline = createHttpApi('http://127.0.0.1:9/api/v1');
    const error = await offline.listCategories().catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('NETWORK_ERROR');
  });
});
