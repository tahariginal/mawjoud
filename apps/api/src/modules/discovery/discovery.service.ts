import type {
  BusinessHours,
  GeoPoint,
  HomeFeed,
  OfferDetail,
  OfferSummary,
  Page,
  SearchResults,
  StorePage,
} from '@mazal/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { type Expression, sql } from 'kysely';

import { APP_CONFIG, type AppConfig } from '../../config/config.ts';
import { DB, type Db } from '../../database/db.ts';
import { geographyPoint } from '../../database/geo.ts';
import { badRequest, notFound } from '../../shared/errors/app-error.ts';
import { CursorCodec } from '../../shared/http/cursor.ts';
import { type OffersQueryParams, pointOf, type SearchQuery } from './discovery.query.ts';
import {
  availabilityRank,
  bboxCenter,
  distanceExpr,
  envelope,
  type OfferRow,
  offerRows,
  storeRows,
  toOfferSummary,
  toStoreSummary,
} from './offer-query.ts';

const HOUR = 3_600_000;
const FEED_RADIUS_M = 10_000;
const DEFAULT_RADIUS_M = 10_000;
const PICKUP_SOON_MS = 2 * HOUR;
const NEW_STORE_DAYS = 30;

/** Shown on every offer until the client's legal terms are final (docs/README.md D7). */
export const OFFER_TERMS =
  'Contents may vary depending on what is left at the end of the day. Allergen information is provided by the store; ask staff if you have a severe allergy. You pay the store when you collect your order.';

const hhmm = (time: string) => time.slice(0, 5);

/** Escapes LIKE wildcards so user text is matched literally. */
const likePattern = (text: string) => `%${text.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;

@Injectable()
export class DiscoveryService {
  private readonly cursors: CursorCodec;

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.cursors = new CursorCodec(config.appSecret);
  }

  /** Offers customers can still reserve: live lifecycle, window not over, active business. */
  private liveOffers(ref: GeoPoint | null, now: Date) {
    return offerRows(this.db, ref).where('o.status', '=', 'ACTIVE').where('o.pickup_end', '>', now);
  }

  private within(point: GeoPoint, radiusM: number) {
    return sql<boolean>`ST_DWithin(o.geog, ${geographyPoint(point)}, ${radiusM})`;
  }

  async listOffers(q: OffersQueryParams): Promise<Page<OfferSummary>> {
    const now = new Date();
    const near = pointOf(q);
    // The request schema guarantees a position (near or bbox); its centre ranks by distance.
    const ref: GeoPoint = near ?? bboxCenter(q.bbox!);

    let query = this.liveOffers(ref, now);
    if (q.bbox) query = query.where(envelope(q.bbox));
    else if (near) query = query.where(this.within(near, q.radiusM ?? DEFAULT_RADIUS_M));
    if (q.categoryIds?.length) query = query.where('o.category_id', 'in', q.categoryIds);
    if (q.dietary?.length)
      query = query.where(sql<boolean>`o.dietary_tags @> ${q.dietary}::text[]`);
    if (q.maxPriceMinor !== undefined) query = query.where('o.price_minor', '<=', q.maxPriceMinor);
    if (q.pickupFrom) query = query.where('o.pickup_end', '>=', new Date(q.pickupFrom));
    if (q.pickupTo) query = query.where('o.pickup_start', '<=', new Date(q.pickupTo));
    if (q.availableOnly) query = query.where('i.quantity_available', '>', 0);
    if (q.minRating !== undefined) {
      query = query.where(
        sql<boolean>`b.rating_count > 0 AND b.rating_sum::float8 / b.rating_count >= ${q.minRating}`,
      );
    }

    // Keyset pagination (ADR-004): the ORDER BY tuple and the cursor tuple are the same.
    const id = sql.ref('o.id');
    const sortExprs: Expression<unknown>[] = {
      relevance: [availabilityRank, distanceExpr(ref), id],
      distance: [distanceExpr(ref), id],
      price: [sql.ref('o.price_minor'), id],
      pickup_time: [sql.ref('o.pickup_start'), id],
    }[q.sort];
    const keyOf = (r: OfferRow): (string | number)[] => {
      switch (q.sort) {
        case 'relevance':
          return [r.avail_rank, r.distance_m ?? 0, r.id];
        case 'distance':
          return [r.distance_m ?? 0, r.id];
        case 'price':
          return [r.price_minor, r.id];
        case 'pickup_time':
          return [r.pickup_start.toISOString(), r.id];
      }
    };

    const { cursor, limit, ...filters } = q;
    const queryHash = this.cursors.queryHash(filters);
    if (cursor) {
      const key = this.cursors.decode(cursor, queryHash);
      if (key.length !== sortExprs.length) throw badRequest('INVALID_CURSOR', 'Cursor is invalid');
      query = query.where(sql<boolean>`(${sql.join(sortExprs)}) > (${sql.join(key)})`);
    }
    for (const expr of sortExprs) query = query.orderBy(expr);

    const rows = await query.limit(limit + 1).execute();
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    const hasMore = rows.length > limit && last !== undefined;
    return {
      data: page.map((r) => toOfferSummary(r, now)),
      page: { nextCursor: hasMore ? this.cursors.encode(keyOf(last), queryHash) : null, hasMore },
    };
  }

  async homeFeed(point: GeoPoint, userId: string | null): Promise<HomeFeed> {
    const now = new Date();
    const available = () =>
      this.liveOffers(point, now)
        .where('i.quantity_available', '>', 0)
        .where(this.within(point, FEED_RADIUS_M));

    const [nearby, pickupSoon, favorites, newStores, categories] = await Promise.all([
      available().orderBy(distanceExpr(point)).orderBy('o.id').limit(10).execute(),
      available()
        .where('o.pickup_start', '<=', new Date(now.getTime() + PICKUP_SOON_MS))
        .orderBy('o.pickup_start')
        .orderBy('o.id')
        .limit(10)
        .execute(),
      userId
        ? this.liveOffers(point, now)
            .where('i.quantity_available', '>', 0)
            .where('o.location_id', 'in', (eb) =>
              eb.selectFrom('favorites').select('location_id').where('user_id', '=', userId),
            )
            .orderBy('o.pickup_start')
            .orderBy('o.id')
            .limit(10)
            .execute()
        : Promise.resolve([]),
      storeRows(this.db, point)
        .where(sql<boolean>`ST_DWithin(l.geog, ${geographyPoint(point)}, ${FEED_RADIUS_M})`)
        .where('l.created_at', '>', new Date(now.getTime() - NEW_STORE_DAYS * 24 * HOUR))
        .orderBy('l.created_at', 'desc')
        .limit(5)
        .execute(),
      this.db
        .selectFrom('categories')
        .select(['id', 'slug', 'name'])
        .where('active', '=', true)
        .orderBy('sort_order')
        .execute(),
    ]);

    return {
      nearby: nearby.map((r) => toOfferSummary(r, now)),
      pickupSoon: pickupSoon.map((r) => toOfferSummary(r, now)),
      favoritesAvailable: favorites.map((r) => toOfferSummary(r, now)),
      newStores: newStores.map(toStoreSummary),
      categories,
    };
  }

  private async hours(locationId: string): Promise<BusinessHours[]> {
    const rows = await this.db
      .selectFrom('business_hours')
      .select(['weekday', 'opens_at', 'closes_at'])
      .where('location_id', '=', locationId)
      .orderBy('weekday')
      .execute();
    return rows.map((h) => ({
      weekday: h.weekday,
      opensAt: hhmm(h.opens_at),
      closesAt: hhmm(h.closes_at),
    }));
  }

  /** Detail stays reachable after the offer ends or sells out (deep links show the state). */
  async offerDetail(offerId: string, point: GeoPoint | null): Promise<OfferDetail> {
    const now = new Date();
    const row = await offerRows(this.db, point)
      .where('o.id', '=', offerId)
      .where('o.status', 'in', ['ACTIVE', 'PAUSED', 'ENDED'])
      .executeTakeFirst();
    if (!row) throw notFound('OFFER_NOT_FOUND', 'Offer not found');
    const [store, hours] = await Promise.all([
      storeRows(this.db, point).where('l.id', '=', row.location_id).executeTakeFirstOrThrow(),
      this.hours(row.location_id),
    ]);
    return {
      ...toOfferSummary(row, now),
      description: row.description,
      contentsNote: row.contents_note,
      allergens: row.allergens as OfferDetail['allergens'],
      dietaryTags: row.dietary_tags as OfferDetail['dietaryTags'],
      maxPerOrder: row.max_per_order,
      storeDetail: {
        ...toStoreSummary(store),
        description: store.description,
        phone: store.phone,
        hours,
      },
      terms: OFFER_TERMS,
    };
  }

  async storePage(
    locationId: string,
    point: GeoPoint | null,
    userId: string | null,
  ): Promise<StorePage> {
    const now = new Date();
    const store = await storeRows(this.db, point).where('l.id', '=', locationId).executeTakeFirst();
    if (!store) throw notFound('NOT_FOUND', 'Store not found');
    const [offers, hours, favorite] = await Promise.all([
      this.liveOffers(point, now)
        .where('o.location_id', '=', locationId)
        .orderBy(availabilityRank)
        .orderBy('o.pickup_start')
        .limit(50)
        .execute(),
      this.hours(locationId),
      userId
        ? this.db
            .selectFrom('favorites')
            .select('location_id')
            .where('user_id', '=', userId)
            .where('location_id', '=', locationId)
            .executeTakeFirst()
        : Promise.resolve(undefined),
    ]);
    return {
      store: {
        ...toStoreSummary(store),
        description: store.description,
        phone: store.phone,
        hours,
      },
      offers: offers.map((r) => toOfferSummary(r, now)),
      isFavorite: favorite !== undefined,
    };
  }

  async search(q: SearchQuery): Promise<SearchResults> {
    const now = new Date();
    const point = pointOf(q);
    const pattern = likePattern(q.q);
    const nameMatches = sql<boolean>`lower(l.name) LIKE ${pattern} ESCAPE '\\'`;

    let stores = storeRows(this.db, point).where(nameMatches);
    stores = point
      ? stores.orderBy(sql`ST_Distance(l.geog, ${geographyPoint(point)})`)
      : stores.orderBy('l.name');

    let offers = this.liveOffers(point, now).where(
      sql<boolean>`(lower(o.title) LIKE ${pattern} ESCAPE '\\' OR ${nameMatches})`,
    );
    offers = offers.orderBy(availabilityRank);
    offers = point ? offers.orderBy(distanceExpr(point)) : offers.orderBy('o.pickup_start');

    const [storeRowsResult, offerRowsResult] = await Promise.all([
      stores.limit(10).execute(),
      offers.limit(20).execute(),
    ]);
    return {
      stores: storeRowsResult.map(toStoreSummary),
      offers: offerRowsResult.map((r) => toOfferSummary(r, now)),
    };
  }
}
