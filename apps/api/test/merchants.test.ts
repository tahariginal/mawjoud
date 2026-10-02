import {
  AdminBusiness,
  ApiErrorEnvelope,
  Me,
  MerchantBusiness,
  MerchantOffer,
  StaffMember,
} from '@mawjood/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createTestApp, type TestContext } from './support/app.ts';
import {
  categoryId,
  createAdmin,
  createMerchant,
  createOffer,
  offerInput,
} from './support/merchants.ts';
import { registerUser } from './support/users.ts';

let t: TestContext;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});

const errorOf = (body: unknown) => ApiErrorEnvelope.parse(body).error;
const HOUR = 3_600_000;

describe('merchant onboarding and admin review', () => {
  it('creates a pending business that cannot sell until approved', async () => {
    const merchant = await createMerchant(t, { approve: false });
    const me = Me.parse(
      (await t.http().get('/api/v1/me').set(merchant.owner.auth).expect(200)).body,
    );
    expect(me.memberships).toEqual([
      { businessId: merchant.businessId, businessName: 'Fournil Test', role: 'OWNER' },
    ]);

    const businesses = z
      .array(MerchantBusiness)
      .parse(
        (await t.http().get('/api/v1/merchant/businesses').set(merchant.owner.auth).expect(200))
          .body,
      );
    expect(businesses[0]?.status).toBe('PENDING_REVIEW');
    expect(businesses[0]?.locations[0]?.location.lat).toBeCloseTo(33.5841, 4);

    const res = await t
      .http()
      .post('/api/v1/merchant/offers')
      .set(merchant.owner.auth)
      .send(offerInput(merchant, await categoryId(t)))
      .expect(403);
    expect(errorOf(res.body).code).toBe('BUSINESS_NOT_ACTIVE');
  });

  it('rejects a second application while one is pending', async () => {
    const merchant = await createMerchant(t, { approve: false });
    const res = await t
      .http()
      .post('/api/v1/merchant/applications')
      .set(merchant.owner.auth)
      .send({
        businessName: 'Second',
        legalName: 'Second SARL',
        categoryId: await categoryId(t),
        addressLine: 'Somewhere 1',
        city: 'Casablanca',
        phone: '+212 600 000 000',
        contactEmail: merchant.owner.email,
        location: { lat: 33.58, lng: -7.63 },
      })
      .expect(409);
    expect(errorOf(res.body).details).toEqual({ reason: 'APPLICATION_PENDING' });
  });

  it('only admins can review, and every decision is audited', async () => {
    const merchant = await createMerchant(t, { approve: false });
    const stranger = await registerUser(t);
    await t
      .http()
      .post(`/api/v1/admin/businesses/${merchant.businessId}/approve`)
      .set(stranger.auth)
      .send({ reason: 'trying' })
      .expect(403);

    const admin = await createAdmin(t);
    const pending = z
      .array(AdminBusiness)
      .parse((await t.http().get('/api/v1/admin/businesses').set(admin.auth).expect(200)).body);
    expect(pending.some((b) => b.id === merchant.businessId)).toBe(true);

    await t
      .http()
      .post(`/api/v1/admin/businesses/${merchant.businessId}/approve`)
      .set(admin.auth)
      .send({ reason: 'Documents checked' })
      .expect(204);
    const again = await t
      .http()
      .post(`/api/v1/admin/businesses/${merchant.businessId}/reject`)
      .set(admin.auth)
      .send({ reason: 'Too late' })
      .expect(409);
    expect(errorOf(again.body).code).toBe('INVALID_STATE_TRANSITION');

    const audit = await t.db
      .selectFrom('audit_logs')
      .selectAll()
      .where('entity_id', '=', merchant.businessId)
      .execute();
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      action: 'business.approve',
      actor_user_id: admin.id,
      reason: 'Documents checked',
    });
  });
});

describe('offers', () => {
  it('creates an offer with server-side currency and inventory', async () => {
    const merchant = await createMerchant(t);
    const offer = await createOffer(t, merchant);
    expect(offer).toMatchObject({
      status: 'ACTIVE',
      price: { amountMinor: 3500, currency: 'MAD' },
      quantityTotal: 5,
      quantityAvailable: 5,
      quantityReservedOrSold: 0,
      version: 0,
    });
  });

  it('validates business rules on the server', async () => {
    const merchant = await createMerchant(t);
    const cat = await categoryId(t);
    const now = Date.now();
    const cases: [Partial<Parameters<typeof offerInput>[2]>, string | null][] = [
      [{ referenceValueMinor: 3000 }, null], // contract refinement → field error
      [
        {
          pickupStart: new Date(now - 3 * HOUR).toISOString(),
          pickupEnd: new Date(now - HOUR).toISOString(),
        },
        'PICKUP_IN_PAST',
      ],
      [
        {
          pickupStart: new Date(now + HOUR).toISOString(),
          pickupEnd: new Date(now + 20 * HOUR).toISOString(),
        },
        'PICKUP_WINDOW_TOO_LONG',
      ],
      [
        {
          pickupStart: new Date(now + 9 * 24 * HOUR).toISOString(),
          pickupEnd: new Date(now + 9 * 24 * HOUR + HOUR).toISOString(),
        },
        'PICKUP_TOO_FAR_AHEAD',
      ],
      [{ categoryId: '00000000-0000-4000-8000-000000000000' }, 'UNKNOWN_CATEGORY'],
    ];
    for (const [overrides, reason] of cases) {
      const res = await t
        .http()
        .post('/api/v1/merchant/offers')
        .set(merchant.owner.auth)
        .send(offerInput(merchant, cat, overrides))
        .expect(400);
      const error = errorOf(res.body);
      expect(error.code).toBe('VALIDATION_FAILED');
      if (reason) expect(error.details?.reason).toBe(reason);
    }
  });

  it('hides other businesses’ offers and stores (404, no existence leak)', async () => {
    const a = await createMerchant(t);
    const b = await createMerchant(t);
    const offer = await createOffer(t, a);
    await t.http().get(`/api/v1/merchant/offers/${offer.id}`).set(b.owner.auth).expect(404);
    await t
      .http()
      .post('/api/v1/merchant/offers')
      .set(b.owner.auth)
      .send(offerInput(a, await categoryId(t)))
      .expect(404);
  });

  it('uses optimistic locking for edits', async () => {
    const merchant = await createMerchant(t);
    const offer = await createOffer(t, merchant);
    const body = { ...offerInput(merchant, offer.categoryId), title: 'Renamed box', version: 0 };
    const updated = MerchantOffer.parse(
      (
        await t
          .http()
          .patch(`/api/v1/merchant/offers/${offer.id}`)
          .set(merchant.owner.auth)
          .send({ ...body, pickupStart: offer.pickup.start, pickupEnd: offer.pickup.end })
          .expect(200)
      ).body,
    );
    expect(updated).toMatchObject({ title: 'Renamed box', version: 1 });

    const stale = await t
      .http()
      .patch(`/api/v1/merchant/offers/${offer.id}`)
      .set(merchant.owner.auth)
      .send({
        ...body,
        pickupStart: offer.pickup.start,
        pickupEnd: offer.pickup.end,
        title: 'Stale',
      })
      .expect(409);
    expect(errorOf(stale.body).code).toBe('CONFLICT_STALE_VERSION');
  });

  it('locks price and window once units are taken, and never drops stock below them', async () => {
    const merchant = await createMerchant(t);
    const offer = await createOffer(t, merchant, { quantity: 5 });
    // Simulate 3 units reserved (orders arrive in the next phase).
    await t.db
      .updateTable('offer_inventory')
      .set({ quantity_available: 2 })
      .where('offer_id', '=', offer.id)
      .execute();

    const base = {
      ...offerInput(merchant, offer.categoryId),
      pickupStart: offer.pickup.start,
      pickupEnd: offer.pickup.end,
      version: 0,
    };
    const price = await t
      .http()
      .patch(`/api/v1/merchant/offers/${offer.id}`)
      .set(merchant.owner.auth)
      .send({ ...base, priceMinor: 2500 })
      .expect(400);
    expect(errorOf(price.body).details?.reason).toBe('LOCKED_AFTER_ORDERS');

    const tooFew = await t
      .http()
      .patch(`/api/v1/merchant/offers/${offer.id}`)
      .set(merchant.owner.auth)
      .send({ ...base, quantity: 2 })
      .expect(400);
    expect(errorOf(tooFew.body).details?.reason).toBe('QUANTITY_BELOW_RESERVED');

    const more = MerchantOffer.parse(
      (
        await t
          .http()
          .patch(`/api/v1/merchant/offers/${offer.id}`)
          .set(merchant.owner.auth)
          .send({ ...base, quantity: 8 })
          .expect(200)
      ).body,
    );
    expect(more).toMatchObject({
      quantityTotal: 8,
      quantityAvailable: 5,
      quantityReservedOrSold: 3,
    });
  });

  it('pauses, resumes and ends', async () => {
    const merchant = await createMerchant(t);
    const offer = await createOffer(t, merchant);
    const step = async (action: string) =>
      MerchantOffer.parse(
        (
          await t
            .http()
            .post(`/api/v1/merchant/offers/${offer.id}/${action}`)
            .set(merchant.owner.auth)
            .expect(200)
        ).body,
      ).status;
    expect(await step('pause')).toBe('PAUSED');
    expect(await step('resume')).toBe('ACTIVE');
    expect(await step('end')).toBe('ENDED');
    const res = await t
      .http()
      .post(`/api/v1/merchant/offers/${offer.id}/resume`)
      .set(merchant.owner.auth)
      .expect(409);
    expect(errorOf(res.body).code).toBe('OFFER_NOT_AVAILABLE');
  });

  it('lists only the business’ offers', async () => {
    const merchant = await createMerchant(t);
    await createOffer(t, merchant);
    await createOffer(t, merchant, { title: 'Bread bag' });
    const list = z
      .array(MerchantOffer)
      .parse(
        (
          await t
            .http()
            .get(`/api/v1/merchant/offers?businessId=${merchant.businessId}`)
            .set(merchant.owner.auth)
            .expect(200)
        ).body,
      );
    expect(list).toHaveLength(2);
  });
});

describe('hours and staff', () => {
  it('sets opening hours (one per weekday)', async () => {
    const merchant = await createMerchant(t);
    await t
      .http()
      .put(`/api/v1/merchant/locations/${merchant.locationId}/hours`)
      .set(merchant.owner.auth)
      .send([
        { weekday: 1, opensAt: '07:30', closesAt: '20:00' },
        { weekday: 1, opensAt: '08:00', closesAt: '21:00' },
      ])
      .expect(400);
    await t
      .http()
      .put(`/api/v1/merchant/locations/${merchant.locationId}/hours`)
      .set(merchant.owner.auth)
      .send([{ weekday: 1, opensAt: '07:30', closesAt: '20:00' }])
      .expect(204);
    const businesses = z
      .array(MerchantBusiness)
      .parse(
        (await t.http().get('/api/v1/merchant/businesses').set(merchant.owner.auth).expect(200))
          .body,
      );
    expect(businesses[0]?.locations[0]?.hours).toEqual([
      { weekday: 1, opensAt: '07:30', closesAt: '20:00' },
    ]);
  });

  it('adds existing users as staff; staff cannot manage offers', async () => {
    const merchant = await createMerchant(t);
    const staff = await registerUser(t, { displayName: 'Staff' });
    await t
      .http()
      .post(`/api/v1/merchant/businesses/${merchant.businessId}/members`)
      .set(merchant.owner.auth)
      .send({ email: 'nobody.here@example.test' })
      .expect(404);
    await t
      .http()
      .post(`/api/v1/merchant/businesses/${merchant.businessId}/members`)
      .set(merchant.owner.auth)
      .send({ email: staff.email })
      .expect(204);
    // Idempotent.
    await t
      .http()
      .post(`/api/v1/merchant/businesses/${merchant.businessId}/members`)
      .set(merchant.owner.auth)
      .send({ email: staff.email })
      .expect(204);

    const members = z
      .array(StaffMember)
      .parse(
        (
          await t
            .http()
            .get(`/api/v1/merchant/businesses/${merchant.businessId}/members`)
            .set(merchant.owner.auth)
            .expect(200)
        ).body,
      );
    expect(members.map((m) => m.role).sort()).toEqual(['OWNER', 'STAFF']);

    await t
      .http()
      .post('/api/v1/merchant/offers')
      .set(staff.auth)
      .send(offerInput(merchant, await categoryId(t)))
      .expect(404);
    await t
      .http()
      .get(`/api/v1/merchant/businesses/${merchant.businessId}/members`)
      .set(staff.auth)
      .expect(404);
  });

  it('prevents an owner from deleting their account while the business is open', async () => {
    const merchant = await createMerchant(t);
    const res = await t
      .http()
      .delete('/api/v1/me')
      .set(merchant.owner.auth)
      .send({ password: merchant.owner.password })
      .expect(403);
    expect(errorOf(res.body).details).toEqual({ reason: 'OWNS_BUSINESS' });
  });
});
