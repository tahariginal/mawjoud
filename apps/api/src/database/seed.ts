import argon2 from 'argon2';
import { sql } from 'kysely';

import { geographyPoint } from './geo.ts';
import type { Db } from './db.ts';

/** Shared password of all seeded development accounts (documented in the README). */
export const DEV_PASSWORD = 'mawjood-dev-password';

const SEED_MARKER = 'dev_seeded_at';
const TZ = 'Africa/Casablanca';
const HOUR = 3_600_000;

type StoreSeed = {
  name: string;
  category: string;
  address: string;
  point: { lat: number; lng: number };
  offers: {
    title: string;
    description: string;
    price: number;
    reference: number | null;
    quantity: number;
    startInHours: number;
    allergens: string[];
    dietary: string[];
  }[];
};

/** Fictional stores in Casablanca (Maarif / Gauthier / Racine). */
const STORES: StoreSeed[] = [
  {
    name: 'Fournil des Oliviers',
    category: 'bakery',
    address: 'Rue du Parc, Maarif',
    point: { lat: 33.5841, lng: -7.6338 },
    offers: [
      {
        title: 'Assorted bread & viennoiseries',
        description: 'Today’s unsold bread and viennoiseries.',
        price: 3500,
        reference: 9000,
        quantity: 4,
        startInHours: 1,
        allergens: ['GLUTEN', 'MILK', 'EGGS'],
        dietary: ['VEGETARIAN'],
      },
      {
        title: 'Sourdough loaves',
        description: 'Two or three sourdough loaves.',
        price: 2500,
        reference: 6000,
        quantity: 3,
        startInHours: 3,
        allergens: ['GLUTEN'],
        dietary: ['VEGAN'],
      },
    ],
  },
  {
    name: 'Café Zellige',
    category: 'cafe',
    address: 'Boulevard Zerktouni',
    point: { lat: 33.5878, lng: -7.6295 },
    offers: [
      {
        title: 'Sandwich & salad box',
        description: 'Sandwiches and salads prepared today.',
        price: 4000,
        reference: 10000,
        quantity: 2,
        startInHours: 0.5,
        allergens: ['GLUTEN', 'MUSTARD'],
        dietary: [],
      },
    ],
  },
  {
    name: 'Pâtisserie Nour',
    category: 'pastry',
    address: 'Rue Ibnou Mounir, Maarif',
    point: { lat: 33.5802, lng: -7.6371 },
    offers: [
      {
        title: 'Pastry selection',
        description: 'Moroccan and French pastries from today.',
        price: 4500,
        reference: 12000,
        quantity: 1,
        startInHours: 2,
        allergens: ['GLUTEN', 'TREE_NUTS', 'MILK', 'EGGS'],
        dietary: ['VEGETARIAN'],
      },
    ],
  },
  {
    name: 'Verdure Épicerie',
    category: 'grocery',
    address: 'Quartier Gauthier',
    point: { lat: 33.5931, lng: -7.6283 },
    offers: [
      {
        title: 'Fruit & vegetable basket',
        description: 'Seasonal produce that is still good but no longer perfect-looking.',
        price: 3000,
        reference: 7500,
        quantity: 6,
        startInHours: 4,
        allergens: [],
        dietary: ['VEGAN', 'GLUTEN_FREE'],
      },
    ],
  },
];

/**
 * Development data: one admin, one merchant owning every seeded store, one customer, all verified,
 * plus offers for today. Runs once per database (re-run after `docker compose down -v`).
 * The CLI refuses to run this outside APP_ENV=development.
 */
/** Returns false when the database was already seeded (nothing changed). */
export async function seedDevelopmentData(db: Db): Promise<boolean> {
  const marker = await db
    .selectFrom('app_config')
    .select('key')
    .where('key', '=', SEED_MARKER)
    .executeTakeFirst();
  if (marker) return false;

  const passwordHash = await argon2.hash(DEV_PASSWORD, { type: argon2.argon2id });
  const now = Date.now();

  await db.transaction().execute(async (trx) => {
    const user = (email: string, displayName: string, role: 'CUSTOMER' | 'ADMIN') =>
      trx
        .insertInto('users')
        .values({
          email,
          display_name: displayName,
          password_hash: passwordHash,
          email_verified_at: new Date(),
          platform_role: role,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

    await user('admin@mawjood.local', 'Admin', 'ADMIN');
    const merchant = await user('merchant@mawjood.local', 'Merchant', 'CUSTOMER');
    await user('customer@mawjood.local', 'Customer', 'CUSTOMER');

    const categories = new Map(
      (await trx.selectFrom('categories').select(['id', 'slug']).execute()).map((c) => [
        c.slug,
        c.id,
      ]),
    );

    for (const store of STORES) {
      const categoryId = categories.get(store.category);
      if (!categoryId) throw new Error(`Missing category ${store.category}`);
      const business = await trx
        .insertInto('businesses')
        .values({
          name: store.name,
          legal_name: `${store.name} SARL`,
          category_id: categoryId,
          contact_email: 'merchant@mawjood.local',
          phone: '+212 522 000 000',
          status: 'ACTIVE',
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      await trx
        .insertInto('business_members')
        .values({ business_id: business.id, user_id: merchant.id, role: 'OWNER' })
        .execute();
      const location = await trx
        .insertInto('business_locations')
        .values({
          business_id: business.id,
          name: store.name,
          address_line: store.address,
          city: 'Casablanca',
          geog: geographyPoint(store.point),
          timezone: TZ,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      await trx
        .insertInto('business_hours')
        .values(
          [1, 2, 3, 4, 5, 6].map((weekday) => ({
            location_id: location.id,
            weekday,
            opens_at: '08:00',
            closes_at: '21:00',
          })),
        )
        .execute();

      for (const offer of store.offers) {
        const start = now + offer.startInHours * HOUR;
        const created = await trx
          .insertInto('offers')
          .values({
            business_id: business.id,
            location_id: location.id,
            category_id: categoryId,
            title: offer.title,
            description: offer.description,
            price_minor: offer.price,
            reference_value_minor: offer.reference,
            currency: 'MAD',
            pickup_start: new Date(start),
            pickup_end: new Date(start + HOUR),
            max_per_order: 2,
            allergens: offer.allergens,
            dietary_tags: offer.dietary,
            geog: sql<string>`(select geog from business_locations where id = ${location.id})`,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        await trx
          .insertInto('offer_inventory')
          .values({
            offer_id: created.id,
            quantity_total: offer.quantity,
            quantity_available: offer.quantity,
          })
          .execute();
      }
    }

    await trx
      .insertInto('app_config')
      .values({ key: SEED_MARKER, value: JSON.stringify(new Date().toISOString()) })
      .execute();
  });
  return true;
}
