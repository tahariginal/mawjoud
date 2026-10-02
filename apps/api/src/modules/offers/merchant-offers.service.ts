import type {
  MerchantOffer,
  MerchantOfferInput,
  UpdateMerchantOfferRequest,
} from '@mawjood/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';

import { APP_CONFIG, type AppConfig } from '../../config/config.ts';
import { DB, type Db } from '../../database/db.ts';
import { isCheckViolation } from '../../database/errors.ts';
import type { OfferDbStatus } from '../../database/schema.ts';
import { AppError, conflict, notFound } from '../../shared/errors/app-error.ts';
import { MerchantAccessService } from '../merchants/merchant-access.service.ts';
import { displayOfferStatus } from './offer-status.ts';

const HOUR = 3_600_000;
/** Offers are published at most a week ahead and for windows of at most 12 hours. */
const MAX_LEAD_TIME_MS = 7 * 24 * HOUR;
const MAX_WINDOW_MS = 12 * HOUR;

const invalid = (reason: string, path?: string) =>
  new AppError('VALIDATION_FAILED', 400, 'The offer is invalid.', {
    reason,
    ...(path ? { fields: [{ path }] } : {}),
  });

type OfferRow = {
  id: string;
  business_id: string;
  location_id: string;
  category_id: string;
  title: string;
  description: string;
  status: OfferDbStatus;
  price_minor: number;
  reference_value_minor: number | null;
  currency: string;
  pickup_start: Date;
  pickup_end: Date;
  timezone: string;
  quantity_total: number;
  quantity_available: number;
  max_per_order: number;
  allergens: string[];
  dietary_tags: string[];
  version: number;
};

@Injectable()
export class MerchantOffersService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(MerchantAccessService) private readonly access: MerchantAccessService,
  ) {}

  private baseQuery() {
    return this.db
      .selectFrom('offers as o')
      .innerJoin('offer_inventory as i', 'i.offer_id', 'o.id')
      .innerJoin('business_locations as l', 'l.id', 'o.location_id')
      .select([
        'o.id',
        'o.business_id',
        'o.location_id',
        'o.category_id',
        'o.title',
        'o.description',
        'o.status',
        'o.price_minor',
        'o.reference_value_minor',
        'o.currency',
        'o.pickup_start',
        'o.pickup_end',
        'l.timezone',
        'i.quantity_total',
        'i.quantity_available',
        'o.max_per_order',
        'o.allergens',
        'o.dietary_tags',
        'o.version',
      ]);
  }

  private toDto(row: OfferRow, now = new Date()): MerchantOffer {
    const money = (amountMinor: number) => ({ amountMinor, currency: row.currency });
    return {
      id: row.id,
      locationId: row.location_id,
      categoryId: row.category_id,
      title: row.title,
      description: row.description,
      status: displayOfferStatus(row.status, row.quantity_available, row.pickup_end, now),
      price: money(row.price_minor),
      referenceValue: row.reference_value_minor === null ? null : money(row.reference_value_minor),
      pickup: {
        start: row.pickup_start.toISOString(),
        end: row.pickup_end.toISOString(),
        timezone: row.timezone,
      },
      quantityTotal: row.quantity_total,
      quantityAvailable: row.quantity_available,
      quantityReservedOrSold: row.quantity_total - row.quantity_available,
      maxPerOrder: row.max_per_order,
      allergens: row.allergens as MerchantOffer['allergens'],
      dietaryTags: row.dietary_tags as MerchantOffer['dietaryTags'],
      version: row.version,
    };
  }

  /** Loads an offer the user may manage (owner of its business); otherwise 404. */
  private async ownedOffer(userId: string, offerId: string): Promise<OfferRow> {
    const row = await this.baseQuery()
      .innerJoin('business_members as m', 'm.business_id', 'o.business_id')
      .where('o.id', '=', offerId)
      .where('m.user_id', '=', userId)
      .where('m.role', '=', 'OWNER')
      .where('o.status', '<>', 'REMOVED')
      .executeTakeFirst();
    if (!row) throw notFound('OFFER_NOT_FOUND', 'Offer not found');
    return row;
  }

  private checkWindow(input: { pickupStart: string; pickupEnd: string }, now: Date): void {
    const start = Date.parse(input.pickupStart);
    const end = Date.parse(input.pickupEnd);
    if (end <= now.getTime()) throw invalid('PICKUP_IN_PAST', 'pickupEnd');
    if (start > now.getTime() + MAX_LEAD_TIME_MS)
      throw invalid('PICKUP_TOO_FAR_AHEAD', 'pickupStart');
    if (end - start > MAX_WINDOW_MS) throw invalid('PICKUP_WINDOW_TOO_LONG', 'pickupEnd');
  }

  private async checkCategory(categoryId: string): Promise<void> {
    const category = await this.db
      .selectFrom('categories')
      .select('id')
      .where('id', '=', categoryId)
      .where('active', '=', true)
      .executeTakeFirst();
    if (!category) throw invalid('UNKNOWN_CATEGORY', 'categoryId');
  }

  async list(userId: string, businessId: string): Promise<MerchantOffer[]> {
    await this.access.business(userId, businessId, ['OWNER']);
    const rows = await this.baseQuery()
      .where('o.business_id', '=', businessId)
      .where('o.status', '<>', 'REMOVED')
      .orderBy('o.pickup_start', 'desc')
      .limit(200)
      .execute();
    const now = new Date();
    return rows.map((r) => this.toDto(r, now));
  }

  async get(userId: string, offerId: string): Promise<MerchantOffer> {
    return this.toDto(await this.ownedOffer(userId, offerId));
  }

  async create(userId: string, input: MerchantOfferInput): Promise<MerchantOffer> {
    const access = await this.access.location(userId, input.locationId, ['OWNER']);
    MerchantAccessService.requireActive(access);
    this.checkWindow(input, new Date());
    await this.checkCategory(input.categoryId);

    const offerId = await this.db.transaction().execute(async (trx) => {
      const offer = await trx
        .insertInto('offers')
        .values({
          business_id: access.businessId,
          location_id: input.locationId,
          category_id: input.categoryId,
          title: input.title,
          description: input.description,
          price_minor: input.priceMinor,
          reference_value_minor: input.referenceValueMinor,
          currency: this.config.defaultCurrency,
          pickup_start: input.pickupStart,
          pickup_end: input.pickupEnd,
          max_per_order: input.maxPerOrder,
          allergens: input.allergens,
          dietary_tags: input.dietaryTags,
          // Denormalised store position for single-table geo queries (docs/DATABASE_DESIGN.md §3.3).
          geog: sql<string>`(select geog from business_locations where id = ${input.locationId})`,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      await trx
        .insertInto('offer_inventory')
        .values({
          offer_id: offer.id,
          quantity_total: input.quantity,
          quantity_available: input.quantity,
        })
        .execute();
      return offer.id;
    });
    return this.get(userId, offerId);
  }

  /**
   * Full update with optimistic locking. Once anything is reserved, price and pickup window are
   * locked (customers already committed to them) and stock cannot drop below what is taken.
   */
  async update(
    userId: string,
    offerId: string,
    input: UpdateMerchantOfferRequest,
  ): Promise<MerchantOffer> {
    const current = await this.ownedOffer(userId, offerId);
    if (input.locationId !== current.location_id) throw invalid('LOCATION_IMMUTABLE', 'locationId');
    if (current.status === 'ENDED' || current.pickup_end.getTime() <= Date.now()) {
      throw conflict('OFFER_NOT_AVAILABLE', 'Offer has ended');
    }
    await this.checkCategory(input.categoryId);

    const windowChanged =
      Date.parse(input.pickupStart) !== current.pickup_start.getTime() ||
      Date.parse(input.pickupEnd) !== current.pickup_end.getTime();
    if (windowChanged) this.checkWindow(input, new Date());

    try {
      await this.db.transaction().execute(async (trx) => {
        // Lock the stock row (reservations lock it too), so "nothing reserved yet" stays true
        // until this transaction commits.
        const inventory = await trx
          .selectFrom('offer_inventory')
          .select(['quantity_total', 'quantity_available'])
          .where('offer_id', '=', offerId)
          .forUpdate()
          .executeTakeFirstOrThrow();
        const taken = inventory.quantity_total - inventory.quantity_available;
        if (taken > 0 && (input.priceMinor !== current.price_minor || windowChanged)) {
          throw invalid('LOCKED_AFTER_ORDERS');
        }
        const updated = await trx
          .updateTable('offers')
          .set({
            category_id: input.categoryId,
            title: input.title,
            description: input.description,
            price_minor: input.priceMinor,
            reference_value_minor: input.referenceValueMinor,
            pickup_start: input.pickupStart,
            pickup_end: input.pickupEnd,
            max_per_order: input.maxPerOrder,
            allergens: input.allergens,
            dietary_tags: input.dietaryTags,
            version: sql<number>`version + 1`,
          })
          .where('id', '=', offerId)
          .where('version', '=', input.version)
          .executeTakeFirst();
        if (Number(updated.numUpdatedRows) === 0) {
          throw conflict('CONFLICT_STALE_VERSION', 'Offer was changed by someone else');
        }
        // New total keeps the units already taken: available = total - taken (checked atomically).
        await trx
          .updateTable('offer_inventory')
          .set({
            quantity_total: input.quantity,
            quantity_available: sql<number>`${input.quantity} - (quantity_total - quantity_available)`,
            updated_at: new Date(),
          })
          .where('offer_id', '=', offerId)
          .execute();
      });
    } catch (error) {
      if (isCheckViolation(error, 'offer_inventory_bounds')) {
        throw invalid('QUANTITY_BELOW_RESERVED', 'quantity');
      }
      throw error;
    }
    return this.get(userId, offerId);
  }

  async setLifecycle(
    userId: string,
    offerId: string,
    action: 'pause' | 'resume' | 'end',
  ): Promise<MerchantOffer> {
    const current = await this.ownedOffer(userId, offerId);
    const ended = current.status === 'ENDED' || current.pickup_end.getTime() <= Date.now();
    if (ended && action !== 'end') throw conflict('OFFER_NOT_AVAILABLE', 'Offer has ended');

    const next: OfferDbStatus =
      action === 'pause' ? 'PAUSED' : action === 'resume' ? 'ACTIVE' : 'ENDED';
    await this.db
      .updateTable('offers')
      .set({ status: next, version: sql<number>`version + 1` })
      .where('id', '=', offerId)
      .where(
        'status',
        'in',
        action === 'end'
          ? ['ACTIVE', 'PAUSED', 'DRAFT']
          : action === 'pause'
            ? ['ACTIVE']
            : ['PAUSED'],
      )
      .execute();
    return this.get(userId, offerId);
  }
}
