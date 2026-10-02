import { MerchantBusiness, MerchantOffer, type MerchantOfferInput } from '@mawjood/contracts';
import { z } from 'zod';

import type { TestContext } from './app.ts';
import { registerUser, setPlatformRole, type TestUser } from './users.ts';

/** Maarif, Casablanca. */
export const STORE_POINT = { lat: 33.5841, lng: -7.6338 };

export type TestMerchant = {
  owner: TestUser;
  businessId: string;
  locationId: string;
};

export async function createAdmin(t: TestContext): Promise<TestUser> {
  const admin = await registerUser(t, { displayName: 'Admin' });
  await setPlatformRole(t, admin.id, 'ADMIN');
  return admin;
}

export async function categoryId(t: TestContext, slug = 'bakery'): Promise<string> {
  const row = await t.db
    .selectFrom('categories')
    .select('id')
    .where('slug', '=', slug)
    .executeTakeFirstOrThrow();
  return row.id;
}

/** Owner applies through the API; an admin approves (unless `approve: false`). */
export async function createMerchant(
  t: TestContext,
  options: {
    approve?: boolean;
    admin?: TestUser;
    name?: string;
    point?: { lat: number; lng: number };
  } = {},
): Promise<TestMerchant> {
  const owner = await registerUser(t, { displayName: 'Owner' });
  await t
    .http()
    .post('/api/v1/merchant/applications')
    .set(owner.auth)
    .send({
      businessName: options.name ?? 'Fournil Test',
      legalName: 'Fournil Test SARL',
      categoryId: await categoryId(t),
      addressLine: 'Rue du Parc, Maarif',
      city: 'Casablanca',
      phone: '+212 522 000 000',
      contactEmail: owner.email,
      location: options.point ?? STORE_POINT,
    })
    .expect(201);
  const businesses = z
    .array(MerchantBusiness)
    .parse((await t.http().get('/api/v1/merchant/businesses').set(owner.auth).expect(200)).body);
  const business = businesses[0]!;
  const locationId = business.locations[0]!.id;

  if (options.approve ?? true) {
    const admin = options.admin ?? (await createAdmin(t));
    await t
      .http()
      .post(`/api/v1/admin/businesses/${business.id}/approve`)
      .set(admin.auth)
      .send({ reason: 'Documents checked' })
      .expect(204);
  }
  return { owner, businessId: business.id, locationId };
}

const HOUR = 3_600_000;

export function offerInput(
  merchant: TestMerchant,
  category: string,
  overrides: Partial<MerchantOfferInput> = {},
): MerchantOfferInput {
  const start = Date.now() + 2 * HOUR;
  return {
    locationId: merchant.locationId,
    categoryId: category,
    title: 'Assorted pastries',
    description: 'Today’s unsold pastries',
    quantity: 5,
    priceMinor: 3500,
    referenceValueMinor: 9000,
    pickupStart: new Date(start).toISOString(),
    pickupEnd: new Date(start + HOUR).toISOString(),
    maxPerOrder: 2,
    allergens: ['GLUTEN', 'MILK'],
    dietaryTags: ['VEGETARIAN'],
    ...overrides,
  };
}

export async function createOffer(
  t: TestContext,
  merchant: TestMerchant,
  overrides: Partial<MerchantOfferInput> = {},
): Promise<MerchantOffer> {
  const res = await t
    .http()
    .post('/api/v1/merchant/offers')
    .set(merchant.owner.auth)
    .send(offerInput(merchant, await categoryId(t), overrides))
    .expect(201);
  return MerchantOffer.parse(res.body);
}
