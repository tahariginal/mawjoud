import type { FavoriteStore, GeoPoint } from '@mawjood/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';

import { DB, type Db } from '../../database/db.ts';
import { notFound } from '../../shared/errors/app-error.ts';
import { storeRows, toStoreSummary } from './offer-query.ts';

/** Favorite stores (PUT/DELETE are idempotent, so double taps never duplicate or fail). */
@Injectable()
export class FavoritesService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(userId: string, point: GeoPoint | null): Promise<FavoriteStore[]> {
    const rows = await storeRows(this.db, point)
      .innerJoin('favorites as f', 'f.location_id', 'l.id')
      .select(
        sql<number>`(
          SELECT count(*)::int FROM offers so JOIN offer_inventory si ON si.offer_id = so.id
          WHERE so.location_id = l.id AND so.status = 'ACTIVE'
            AND so.pickup_end > now() AND si.quantity_available > 0
        )`.as('available_offers'),
      )
      .where('f.user_id', '=', userId)
      .orderBy('f.created_at', 'desc')
      .limit(200)
      .execute();
    return rows.map((r) => ({ store: toStoreSummary(r), availableOffers: r.available_offers }));
  }

  async add(userId: string, locationId: string): Promise<void> {
    const store = await storeRows(this.db, null).where('l.id', '=', locationId).executeTakeFirst();
    if (!store) throw notFound('NOT_FOUND', 'Store not found');
    await this.db
      .insertInto('favorites')
      .values({ user_id: userId, location_id: locationId })
      .onConflict((oc) => oc.columns(['user_id', 'location_id']).doNothing())
      .execute();
  }

  async remove(userId: string, locationId: string): Promise<void> {
    await this.db
      .deleteFrom('favorites')
      .where('user_id', '=', userId)
      .where('location_id', '=', locationId)
      .execute();
  }
}
