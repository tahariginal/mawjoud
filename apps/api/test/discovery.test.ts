import {
  ApiErrorEnvelope,
  FavoriteStore,
  HomeFeed,
  OfferDetail,
  OfferSummary,
  pageOf,
  SearchResults,
  StorePage,
} from '@mazal/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createTestApp, type TestContext } from './support/app.ts';
import {
  categoryId,
  createAdmin,
  createMerchant,
  createOffer,
  type TestMerchant,
} from './support/merchants.ts';
import { registerUser, type TestUser } from './support/users.ts';

const OfferPage = pageOf(OfferSummary);
const HOUR = 3_600_000;

/** Casablanca: Maarif (here), Gauthier (~1.2 km), Mohammedia (~20 km, outside 10 km). */
const HERE = { lat: 33.5841, lng: -7.6338 };
const NEAR = { lat: 33.5931, lng: -7.6283 };
const FAR = { lat: 33.6866, lng: -7.3828 };

let t: TestContext;
let admin: TestUser;
let here: TestMerchant;
let near: TestMerchant;
let far: TestMerchant;
let pending: TestMerchant;
const ids: Record<string, string> = {};

const q = (params: Record<string, string | number>) =>
  new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
const errorOf = (body: unknown) => ApiErrorEnvelope.parse(body).error;

beforeAll(async () => {
  t = await createTestApp();
  admin = await createAdmin(t);
  here = await createMerchant(t, { admin, name: 'Fournil Maarif', point: HERE });
  near = await createMerchant(t, { admin, name: 'Café Gauthier', point: NEAR });
  far = await createMerchant(t, { admin, name: 'Far Bakery', point: FAR });
  pending = await createMerchant(t, { approve: false, name: 'Pending Shop', point: HERE });

  const soon = Date.now() + HOUR;
  const later = Date.now() + 5 * HOUR;
  const cafe = await categoryId(t, 'cafe');
  ids.bread = (
    await createOffer(t, here, {
      title: 'Bread bag',
      priceMinor: 2000,
      referenceValueMinor: 6000,
      dietaryTags: ['VEGAN'],
      pickupStart: new Date(soon).toISOString(),
      pickupEnd: new Date(soon + HOUR).toISOString(),
    })
  ).id;
  ids.pastry = (
    await createOffer(t, here, {
      title: 'Pastry box',
      priceMinor: 4500,
      pickupStart: new Date(later).toISOString(),
      pickupEnd: new Date(later + HOUR).toISOString(),
    })
  ).id;
  ids.coffee = (
    await createOffer(t, near, {
      title: 'Sandwich & coffee',
      categoryId: cafe,
      priceMinor: 3000,
      quantity: 1,
    })
  ).id;
  ids.far = (await createOffer(t, far, { title: 'Far box' })).id;
  ids.paused = (await createOffer(t, near, { title: 'Paused box' })).id;
  await t
    .http()
    .post(`/api/v1/merchant/offers/${ids.paused}/pause`)
    .set(near.owner.auth)
    .expect(200);
  // Sold out (stock taken directly: orders arrive in the next phase).
  await t.db
    .updateTable('offer_inventory')
    .set({ quantity_available: 0 })
    .where('offer_id', '=', ids.coffee)
    .execute();
});

afterAll(async () => {
  await t.close();
});

describe('GET /offers', () => {
  it('requires a position', async () => {
    const res = await t.http().get('/api/v1/offers').expect(400);
    expect(errorOf(res.body).code).toBe('VALIDATION_FAILED');
  });

  it('returns nearby offers of active businesses only, nearest first', async () => {
    const res = await t
      .http()
      .get(`/api/v1/offers?${q({ ...HERE, radiusM: 5000, sort: 'distance' })}`)
      .expect(200);
    const page = OfferPage.parse(res.body);
    const titles = page.data.map((o) => o.title);
    expect(titles).not.toContain('Far box');
    expect(titles).not.toContain('Paused box');
    expect(page.data.every((o) => o.distanceM !== null)).toBe(true);
    const distances = page.data.map((o) => o.distanceM ?? 0);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
    // The ~1.2 km store is computed by PostGIS.
    const coffee = page.data.find((o) => o.id === ids.coffee);
    expect(coffee?.distanceM).toBeGreaterThan(900);
    expect(coffee?.distanceM).toBeLessThan(1500);
    expect(coffee?.status).toBe('SOLD_OUT');
  });

  it('ranks available offers before sold-out ones by default', async () => {
    const page = OfferPage.parse(
      (
        await t
          .http()
          .get(`/api/v1/offers?${q({ ...HERE, radiusM: 5000 })}`)
          .expect(200)
      ).body,
    );
    expect(page.data[page.data.length - 1]?.id).toBe(ids.coffee);
  });

  it('applies filters on the server', async () => {
    const list = async (extra: Record<string, string | number>) =>
      OfferPage.parse(
        (
          await t
            .http()
            .get(`/api/v1/offers?${q({ ...HERE, radiusM: 5000, ...extra })}`)
            .expect(200)
        ).body,
      ).data.map((o) => o.id);
    expect(await list({ maxPriceMinor: 2500 })).toEqual([ids.bread]);
    expect(await list({ dietary: 'VEGAN' })).toEqual([ids.bread]);
    expect(await list({ availableOnly: 'true' })).not.toContain(ids.coffee);
    expect(await list({ categoryIds: await categoryId(t, 'cafe') })).toEqual([ids.coffee]);
    expect(await list({ minRating: 4 })).toEqual([]);
    expect(
      await list({ pickupTo: new Date(Date.now() + 2 * HOUR).toISOString(), sort: 'pickup_time' }),
    ).toContain(ids.bread);
    expect(await list({ pickupTo: new Date(Date.now() + 2 * HOUR).toISOString() })).not.toContain(
      ids.pastry,
    );
  });

  it('searches a map viewport', async () => {
    const bbox = `${HERE.lng - 0.01},${HERE.lat - 0.01},${HERE.lng + 0.001},${HERE.lat + 0.001}`;
    const page = OfferPage.parse(
      (
        await t
          .http()
          .get(`/api/v1/offers?${q({ bbox })}`)
          .expect(200)
      ).body,
    );
    expect(page.data.map((o) => o.id).sort()).toEqual([ids.bread, ids.pastry].sort());
  });

  it('paginates with signed keyset cursors and never repeats rows', async () => {
    for (const sort of ['relevance', 'distance', 'price', 'pickup_time']) {
      const first = OfferPage.parse(
        (
          await t
            .http()
            .get(`/api/v1/offers?${q({ ...HERE, radiusM: 5000, sort, limit: 2 })}`)
            .expect(200)
        ).body,
      );
      expect(first.page.hasMore).toBe(true);
      const second = OfferPage.parse(
        (
          await t
            .http()
            .get(
              `/api/v1/offers?${q({ ...HERE, radiusM: 5000, sort, limit: 2, cursor: first.page.nextCursor ?? '' })}`,
            )
            .expect(200)
        ).body,
      );
      const all = [...first.data, ...second.data].map((o) => o.id);
      expect(new Set(all).size).toBe(3);
      expect(second.page.hasMore).toBe(false);
    }
  });

  it('rejects cursors reused with other filters or tampered with', async () => {
    const first = OfferPage.parse(
      (
        await t
          .http()
          .get(`/api/v1/offers?${q({ ...HERE, radiusM: 5000, limit: 1 })}`)
          .expect(200)
      ).body,
    );
    const cursor = first.page.nextCursor ?? '';
    const reused = await t
      .http()
      .get(`/api/v1/offers?${q({ ...HERE, radiusM: 5000, sort: 'price', limit: 1, cursor })}`)
      .expect(400);
    expect(errorOf(reused.body).code).toBe('INVALID_CURSOR');
    await t
      .http()
      .get(`/api/v1/offers?${q({ ...HERE, radiusM: 5000, limit: 1, cursor: `${cursor}x` })}`)
      .expect(400);
  });
});

describe('home feed', () => {
  it('builds sections for a guest', async () => {
    const feed = HomeFeed.parse(
      (
        await t
          .http()
          .get(`/api/v1/feed/home?${q(HERE)}`)
          .expect(200)
      ).body,
    );
    expect(feed.nearby.map((o) => o.id)).toEqual([ids.bread, ids.pastry]);
    expect(feed.pickupSoon.map((o) => o.id)).toEqual([ids.bread]);
    expect(feed.favoritesAvailable).toEqual([]);
    expect(feed.newStores.map((s) => s.name).sort()).toEqual(['Café Gauthier', 'Fournil Maarif']);
    expect(feed.categories.length).toBe(5);
  });

  it('shows favorites with food for a signed-in user', async () => {
    const user = await registerUser(t);
    await t.http().put(`/api/v1/favorites/stores/${here.locationId}`).set(user.auth).expect(204);
    const feed = HomeFeed.parse(
      (
        await t
          .http()
          .get(`/api/v1/feed/home?${q(HERE)}`)
          .set(user.auth)
          .expect(200)
      ).body,
    );
    expect(feed.favoritesAvailable.map((o) => o.id).sort()).toEqual([ids.bread, ids.pastry].sort());
  });
});

describe('offer and store pages', () => {
  it('returns offer detail with store info and allergens', async () => {
    const detail = OfferDetail.parse(
      (
        await t
          .http()
          .get(`/api/v1/offers/${ids.pastry}?${q(HERE)}`)
          .expect(200)
      ).body,
    );
    expect(detail).toMatchObject({
      title: 'Pastry box',
      allergens: ['GLUTEN', 'MILK'],
      maxPerOrder: 2,
    });
    expect(detail.storeDetail.name).toBe('Fournil Maarif');
    expect(detail.terms.length).toBeGreaterThan(10);
  });

  it('keeps paused offers reachable by link, but not pending businesses', async () => {
    const paused = OfferDetail.parse(
      (await t.http().get(`/api/v1/offers/${ids.paused}`).expect(200)).body,
    );
    expect(paused.status).toBe('PAUSED');
    await t.http().get(`/api/v1/stores/${pending.locationId}`).expect(404);
    await t.http().get('/api/v1/offers/00000000-0000-4000-8000-000000000000').expect(404);
  });

  it('returns the store page with live offers and favorite state', async () => {
    const user = await registerUser(t);
    const guest = StorePage.parse(
      (await t.http().get(`/api/v1/stores/${here.locationId}`).expect(200)).body,
    );
    expect(guest.isFavorite).toBe(false);
    expect(guest.offers).toHaveLength(2);
    await t.http().put(`/api/v1/favorites/stores/${here.locationId}`).set(user.auth).expect(204);
    const mine = StorePage.parse(
      (await t.http().get(`/api/v1/stores/${here.locationId}`).set(user.auth).expect(200)).body,
    );
    expect(mine.isFavorite).toBe(true);
  });
});

describe('search', () => {
  it('finds offers by title and stores by name', async () => {
    const res = SearchResults.parse(
      (
        await t
          .http()
          .get(`/api/v1/search?${q({ q: 'pastry', ...HERE })}`)
          .expect(200)
      ).body,
    );
    expect(res.offers.map((o) => o.id)).toEqual([ids.pastry]);
    const stores = SearchResults.parse(
      (
        await t
          .http()
          .get(`/api/v1/search?${q({ q: 'gauthier' })}`)
          .expect(200)
      ).body,
    );
    expect(stores.stores.map((s) => s.name)).toEqual(['Café Gauthier']);
  });

  it('treats LIKE wildcards literally', async () => {
    const res = SearchResults.parse(
      (
        await t
          .http()
          .get(`/api/v1/search?${q({ q: '%%' })}`)
          .expect(200)
      ).body,
    );
    expect(res.offers).toEqual([]);
    expect(res.stores).toEqual([]);
  });
});

describe('favorites', () => {
  it('adds idempotently, lists with available offer counts, and removes', async () => {
    const user = await registerUser(t);
    await t.http().get('/api/v1/favorites').expect(401);
    await t.http().put(`/api/v1/favorites/stores/${near.locationId}`).set(user.auth).expect(204);
    await t.http().put(`/api/v1/favorites/stores/${near.locationId}`).set(user.auth).expect(204);
    const list = z.array(FavoriteStore).parse(
      (
        await t
          .http()
          .get(`/api/v1/favorites?${q(HERE)}`)
          .set(user.auth)
          .expect(200)
      ).body,
    );
    expect(list).toHaveLength(1);
    // Coffee is sold out and the other offer is paused: nothing available right now.
    expect(list[0]?.availableOffers).toBe(0);
    await t.http().delete(`/api/v1/favorites/stores/${near.locationId}`).set(user.auth).expect(204);
    const after = z
      .array(FavoriteStore)
      .parse((await t.http().get('/api/v1/favorites').set(user.auth).expect(200)).body);
    expect(after).toEqual([]);
    await t
      .http()
      .put('/api/v1/favorites/stores/00000000-0000-4000-8000-000000000000')
      .set(user.auth)
      .expect(404);
  });

  it('removes favorites when the account is deleted', async () => {
    const user = await registerUser(t);
    await t.http().put(`/api/v1/favorites/stores/${here.locationId}`).set(user.auth).expect(204);
    await t
      .http()
      .delete('/api/v1/me')
      .set(user.auth)
      .send({ password: user.password })
      .expect(204);
    const rows = await t.db
      .selectFrom('favorites')
      .selectAll()
      .where('user_id', '=', user.id)
      .execute();
    expect(rows).toEqual([]);
  });
});
