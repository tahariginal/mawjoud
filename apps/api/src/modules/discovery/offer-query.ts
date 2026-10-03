import type { BoundingBox, GeoPoint, OfferSummary, Rating, StoreSummary } from '@mazal/contracts';
import { type InferResult, sql } from 'kysely';

import type { Db } from '../../database/db.ts';
import { geographyPoint, latitudeOf, longitudeOf } from '../../database/geo.ts';
import { displayOfferStatus } from '../offers/offer-status.ts';

/** Distance in meters computed by PostGIS (never in JavaScript, docs/SCALABILITY.md §3). */
export function distanceExpr(ref: GeoPoint) {
  return sql<number>`ST_Distance(o.geog, ${geographyPoint(ref)})`;
}

/** 0 when units remain, 1 when sold out: available offers rank first. */
export const availabilityRank = sql<number>`(CASE WHEN i.quantity_available > 0 THEN 0 ELSE 1 END)`;

export function bboxCenter(b: BoundingBox): GeoPoint {
  return { lat: (b.minLat + b.maxLat) / 2, lng: (b.minLng + b.maxLng) / 2 };
}

export function envelope(b: BoundingBox) {
  return sql<boolean>`o.geog && ST_MakeEnvelope(${b.minLng}, ${b.minLat}, ${b.maxLng}, ${b.maxLat}, 4326)::geography`;
}

/** Offers of active businesses with everything a summary or detail needs. */
export function offerRows(db: Db, ref: GeoPoint | null) {
  return db
    .selectFrom('offers as o')
    .innerJoin('offer_inventory as i', 'i.offer_id', 'o.id')
    .innerJoin('business_locations as l', 'l.id', 'o.location_id')
    .innerJoin('businesses as b', 'b.id', 'o.business_id')
    .select([
      'o.id',
      'o.title',
      'o.category_id',
      'o.price_minor',
      'o.reference_value_minor',
      'o.currency',
      'o.pickup_start',
      'o.pickup_end',
      'o.status',
      'o.description',
      'o.contents_note',
      'o.allergens',
      'o.dietary_tags',
      'o.max_per_order',
      'i.quantity_available',
      'l.id as location_id',
      'l.name as store_name',
      'l.timezone',
      latitudeOf(sql.ref('l.geog')).as('lat'),
      longitudeOf(sql.ref('l.geog')).as('lng'),
      'b.rating_sum',
      'b.rating_count',
      availabilityRank.as('avail_rank'),
      (ref ? distanceExpr(ref) : sql<number | null>`NULL::float8`).as('distance_m'),
    ])
    .where('b.status', '=', 'ACTIVE');
}

export type OfferRow = InferResult<ReturnType<typeof offerRows>>[number];

export function ratingOf(sum: number, count: number): Rating | null {
  return count > 0 ? { average: Math.round((sum / count) * 10) / 10, count } : null;
}

export function toOfferSummary(row: OfferRow, now: Date): OfferSummary {
  const money = (amountMinor: number) => ({ amountMinor, currency: row.currency });
  return {
    id: row.id,
    title: row.title,
    store: {
      id: row.location_id,
      name: row.store_name,
      logo: null,
      location: { lat: row.lat, lng: row.lng },
    },
    categoryId: row.category_id,
    image: null,
    price: money(row.price_minor),
    referenceValue: row.reference_value_minor === null ? null : money(row.reference_value_minor),
    pickup: {
      start: row.pickup_start.toISOString(),
      end: row.pickup_end.toISOString(),
      timezone: row.timezone,
    },
    quantityAvailable: row.quantity_available,
    status: displayOfferStatus(row.status, row.quantity_available, row.pickup_end, now),
    distanceM: row.distance_m === null ? null : Math.max(0, row.distance_m),
    rating: ratingOf(row.rating_sum, row.rating_count),
  };
}

/** Stores (business locations) of active businesses. */
export function storeRows(db: Db, ref: GeoPoint | null) {
  return db
    .selectFrom('business_locations as l')
    .innerJoin('businesses as b', 'b.id', 'l.business_id')
    .select([
      'l.id',
      'l.business_id',
      'l.name',
      'l.address_line',
      'l.city',
      'l.postal_code',
      'l.country_code',
      'l.timezone',
      'l.phone',
      'l.created_at',
      'b.category_id',
      'b.description',
      'b.rating_sum',
      'b.rating_count',
      latitudeOf(sql.ref('l.geog')).as('lat'),
      longitudeOf(sql.ref('l.geog')).as('lng'),
      (ref
        ? sql<number>`ST_Distance(l.geog, ${geographyPoint(ref)})`
        : sql<number | null>`NULL::float8`
      ).as('distance_m'),
      sql<boolean>`EXISTS (
        SELECT 1 FROM offers so JOIN offer_inventory si ON si.offer_id = so.id
        WHERE so.location_id = l.id AND so.status = 'ACTIVE'
          AND so.pickup_end > now() AND si.quantity_available > 0
      )`.as('has_offers_now'),
    ])
    .where('b.status', '=', 'ACTIVE');
}

export type StoreRow = InferResult<ReturnType<typeof storeRows>>[number];

export function toStoreSummary(row: StoreRow): StoreSummary {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    categoryId: row.category_id,
    logo: null,
    cover: null,
    address: {
      line1: row.address_line,
      city: row.city,
      postalCode: row.postal_code,
      countryCode: row.country_code,
    },
    location: { lat: row.lat, lng: row.lng },
    distanceM: row.distance_m === null ? null : Math.max(0, row.distance_m),
    rating: ratingOf(row.rating_sum, row.rating_count),
    timezone: row.timezone,
    hasOffersNow: row.has_offers_now,
  };
}
