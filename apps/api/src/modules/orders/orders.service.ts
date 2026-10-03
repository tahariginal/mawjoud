import {
  type CreateOrderRequest,
  type ImpactSummary,
  type Order,
  type OrdersScope,
  PICKUP_CODE_ALPHABET,
  type Page,
  type Quote,
  type QuoteRequest,
  type ReviewRequest,
} from '@mazal/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { sql, type Transaction } from 'kysely';

import { APP_CONFIG, type AppConfig } from '../../config/config.ts';
import { DB, type Db } from '../../database/db.ts';
import { isUniqueViolation } from '../../database/errors.ts';
import type { Database, OrderDbStatus } from '../../database/schema.ts';
import { AppError, conflict, notFound } from '../../shared/errors/app-error.ts';
import { CursorCodec } from '../../shared/http/cursor.ts';
import { IdempotencyService } from '../../shared/idempotency/idempotency.ts';
import { randomFromAlphabet } from '../../shared/security/crypto.ts';
import { displayOfferStatus } from '../offers/offer-status.ts';
import { loadItems, orderRows, toOrder } from './order-mapper.ts';

const OPEN_STATUSES: OrderDbStatus[] = ['CONFIRMED', 'READY_FOR_PICKUP'];
const UPCOMING_STATUSES: OrderDbStatus[] = [
  'CREATED',
  'PAYMENT_PENDING',
  'CONFIRMED',
  'READY_FOR_PICKUP',
];
const PAST_STATUSES: OrderDbStatus[] = ['PICKED_UP', 'CANCELLED', 'EXPIRED', 'FAILED', 'NO_SHOW'];
const PAGE_SIZE = 20;

/** Version of the pricing rules; part of the quote so a rule change re-confirms totals. */
const PRICING_VERSION = 'v1';

/** Collisions on generated codes are astronomically rare; when they happen we just retry. */
const isCodeCollision = (error: unknown) =>
  isUniqueViolation(error, 'orders_short_code_key') ||
  isUniqueViolation(error, 'orders_open_pickup_code_uq');

type Tx = Transaction<Database>;

@Injectable()
export class OrdersService {
  private readonly cursors: CursorCodec;

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
  ) {
    this.cursors = new CursorCodec(config.appSecret);
  }

  private async loadOffer(executor: Db | Tx, offerId: string) {
    const offer = await executor
      .selectFrom('offers as o')
      .innerJoin('offer_inventory as i', 'i.offer_id', 'o.id')
      .innerJoin('businesses as b', 'b.id', 'o.business_id')
      .innerJoin('business_locations as l', 'l.id', 'o.location_id')
      .select([
        'o.id',
        'o.business_id',
        'o.location_id',
        'o.title',
        'o.status',
        'o.price_minor',
        'o.reference_value_minor',
        'o.currency',
        'o.pickup_start',
        'o.pickup_end',
        'o.max_per_order',
        'i.quantity_available',
        'l.timezone',
      ])
      .where('o.id', '=', offerId)
      .where('b.status', '=', 'ACTIVE')
      .where('o.status', '<>', 'REMOVED')
      .executeTakeFirst();
    if (!offer) throw notFound('OFFER_NOT_FOUND', 'Offer not found');
    return offer;
  }

  /** Server-side pricing (the client never computes totals). Fees/tax are 0 until D7. */
  private price(
    offer: { price_minor: number; currency: string; id: string },
    quantity: number,
  ): Quote {
    const subtotal = offer.price_minor * quantity;
    const money = (amountMinor: number) => ({ amountMinor, currency: offer.currency });
    return {
      offerId: offer.id,
      quantity,
      breakdown: {
        unitPrice: money(offer.price_minor),
        subtotal: money(subtotal),
        fees: money(0),
        discount: money(0),
        tax: money(0),
        total: money(subtotal),
      },
      quoteVersion: `${PRICING_VERSION}:${offer.price_minor}:${offer.currency}`,
    };
  }

  private checkReservable(
    offer: Awaited<ReturnType<OrdersService['loadOffer']>>,
    quantity: number,
    now: Date,
  ): void {
    const status = displayOfferStatus(
      offer.status,
      offer.quantity_available,
      offer.pickup_end,
      now,
    );
    if (status === 'SOLD_OUT')
      throw conflict('OFFER_SOLD_OUT', 'This offer is no longer available.');
    if (status !== 'ACTIVE') throw conflict('OFFER_NOT_AVAILABLE', 'This offer is not available.');
    if (quantity > offer.max_per_order) {
      throw new AppError('OFFER_QUANTITY_LIMIT', 422, 'Quantity above the per-order limit', {
        max: offer.max_per_order,
      });
    }
    if (quantity > offer.quantity_available) {
      throw conflict('OFFER_SOLD_OUT', 'Not enough units left.');
    }
  }

  async quote(input: QuoteRequest): Promise<Quote> {
    const offer = await this.loadOffer(this.db, input.offerId);
    this.checkReservable(offer, input.quantity, new Date());
    return this.price(offer, input.quantity);
  }

  private async getOwned(executor: Db | Tx, userId: string, orderId: string): Promise<Order> {
    const row = await orderRows(executor)
      .where('o.id', '=', orderId)
      .where('o.user_id', '=', userId)
      .executeTakeFirst();
    if (!row) throw notFound('ORDER_NOT_FOUND', 'Order not found');
    return toOrder(row, await loadItems(executor, [row.id]), this.config.appSecret, new Date());
  }

  getOrder(userId: string, orderId: string): Promise<Order> {
    return this.getOwned(this.db, userId, orderId);
  }

  /**
   * Reserve (ADR-009, ADR-015): one transaction, exactly once per idempotency key.
   * The last unit can only be taken once: the conditional UPDATE re-checks stock under the
   * row lock, and the CHECK constraint is the backstop.
   */
  async create(userId: string, input: CreateOrderRequest, idempotencyKey: string): Promise<Order> {
    return this.idempotency.execute(
      userId,
      'orders.create',
      idempotencyKey,
      input,
      (trx) => this.reserve(trx, userId, input),
      isCodeCollision,
    );
  }

  private async reserve(trx: Tx, userId: string, input: CreateOrderRequest): Promise<Order> {
    const now = new Date();

    // Serialises one user's reservations so the active-reservation cap cannot be raced.
    // NO KEY UPDATE (not UPDATE): it must not conflict with the FK share locks that this and
    // concurrent transactions take on the user row when inserting idempotency keys and orders.
    const user = await trx
      .selectFrom('users')
      .select(['email_verified_at', 'status'])
      .where('id', '=', userId)
      .forNoKeyUpdate()
      .executeTakeFirst();
    if (!user || user.status !== 'ACTIVE')
      throw new AppError('AUTH_SESSION_REVOKED', 401, 'Account is not active');
    if (!user.email_verified_at) {
      throw new AppError('AUTH_EMAIL_NOT_VERIFIED', 403, 'Verify your email before reserving');
    }

    const active = await trx
      .selectFrom('orders')
      .select(sql<number>`count(*)::int`.as('n'))
      .where('user_id', '=', userId)
      .where('status', 'in', OPEN_STATUSES)
      .executeTakeFirstOrThrow();
    if (active.n >= this.config.maxActiveReservations) {
      throw conflict('ORDER_LIMIT_REACHED', 'Too many active reservations', {
        max: this.config.maxActiveReservations,
      });
    }

    const offer = await this.loadOffer(trx, input.offerId);
    this.checkReservable(offer, input.quantity, now);
    const quote = this.price(offer, input.quantity);
    if (input.quoteVersion !== undefined && input.quoteVersion !== quote.quoteVersion) {
      throw conflict('PRICE_CHANGED', 'The price has changed', { quote });
    }

    const decremented = await trx
      .updateTable('offer_inventory')
      .set({
        quantity_available: sql<number>`quantity_available - ${input.quantity}`,
        updated_at: now,
      })
      .where('offer_id', '=', offer.id)
      .where('quantity_available', '>=', input.quantity)
      .returning('quantity_available')
      .executeTakeFirst();
    if (!decremented) throw conflict('OFFER_SOLD_OUT', 'This offer is no longer available.');

    // Ordered during the window: the order is immediately ready for pickup.
    const status: OrderDbStatus = now >= offer.pickup_start ? 'READY_FOR_PICKUP' : 'CONFIRMED';
    const { total } = quote.breakdown;
    const order = await trx
      .insertInto('orders')
      .values({
        short_code: `MZ-${randomFromAlphabet(6, PICKUP_CODE_ALPHABET)}`,
        user_id: userId,
        business_id: offer.business_id,
        location_id: offer.location_id,
        status,
        subtotal_minor: quote.breakdown.subtotal.amountMinor,
        total_minor: total.amountMinor,
        currency: offer.currency,
        pickup_start: offer.pickup_start,
        pickup_end: offer.pickup_end,
        pickup_timezone: offer.timezone,
        pickup_code: randomFromAlphabet(6, PICKUP_CODE_ALPHABET),
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    await trx
      .insertInto('order_items')
      .values({
        order_id: order.id,
        offer_id: offer.id,
        title: offer.title,
        quantity: input.quantity,
        unit_price_minor: offer.price_minor,
        reference_value_minor: offer.reference_value_minor,
        currency: offer.currency,
      })
      .execute();

    const history = [
      { from_status: null, to_status: 'CREATED' as const },
      { from_status: 'CREATED' as const, to_status: 'CONFIRMED' as const },
      ...(status === 'READY_FOR_PICKUP'
        ? [{ from_status: 'CONFIRMED' as const, to_status: 'READY_FOR_PICKUP' as const }]
        : []),
    ];
    await trx
      .insertInto('order_status_history')
      .values(
        history.map((h) => ({
          order_id: order.id,
          ...h,
          actor_type:
            h.to_status === 'READY_FOR_PICKUP' ? ('SYSTEM' as const) : ('CUSTOMER' as const),
          actor_id: h.to_status === 'READY_FOR_PICKUP' ? null : userId,
        })),
      )
      .execute();

    return this.getOwned(trx, userId, order.id);
  }

  /** Customer cancellation before the pickup window starts; stock goes back (exactly once). */
  async cancel(userId: string, orderId: string, reason: string | undefined): Promise<Order> {
    await this.db.transaction().execute(async (trx) => {
      const order = await trx
        .selectFrom('orders')
        .select(['id', 'status', 'pickup_start'])
        .where('id', '=', orderId)
        .where('user_id', '=', userId)
        .forUpdate()
        .executeTakeFirst();
      if (!order) throw notFound('ORDER_NOT_FOUND', 'Order not found');
      if (order.status === 'CANCELLED') return; // Idempotent.
      if (order.status !== 'CONFIRMED' || Date.now() >= order.pickup_start.getTime()) {
        throw conflict('ORDER_CANCELLATION_CLOSED', 'This order can no longer be cancelled');
      }
      await this.cancelInTransaction(
        trx,
        order.id,
        order.status,
        'CUSTOMER',
        userId,
        reason ?? null,
      );
    });
    return this.getOwned(this.db, userId, orderId);
  }

  /** Guarded transition to CANCELLED + stock release + history, inside the caller's transaction. */
  async cancelInTransaction(
    trx: Tx,
    orderId: string,
    from: OrderDbStatus,
    actor: 'CUSTOMER' | 'MERCHANT' | 'ADMIN' | 'SYSTEM',
    actorId: string | null,
    reason: string | null,
  ): Promise<void> {
    const updated = await trx
      .updateTable('orders')
      .set({
        status: 'CANCELLED',
        cancelled_at: new Date(),
        cancelled_reason: reason,
        cancelled_by: actor,
      })
      .where('id', '=', orderId)
      .where('status', '=', from)
      .executeTakeFirst();
    if (Number(updated.numUpdatedRows) !== 1) {
      throw conflict('ORDER_INVALID_TRANSITION', 'Order changed meanwhile');
    }
    const items = await trx
      .selectFrom('order_items')
      .select(['offer_id', 'quantity'])
      .where('order_id', '=', orderId)
      .execute();
    for (const item of items) {
      await trx
        .updateTable('offer_inventory')
        .set({
          quantity_available: sql<number>`quantity_available + ${item.quantity}`,
          updated_at: new Date(),
        })
        .where('offer_id', '=', item.offer_id)
        .execute();
    }
    await trx
      .insertInto('order_status_history')
      .values({
        order_id: orderId,
        from_status: from,
        to_status: 'CANCELLED',
        actor_type: actor,
        actor_id: actorId,
        reason,
      })
      .execute();
  }

  /** Account deletion: cancel every open reservation (stock back) in the deletion transaction. */
  async cancelAllOpenForUser(trx: Tx, userId: string): Promise<void> {
    const open = await trx
      .selectFrom('orders')
      .select(['id', 'status'])
      .where('user_id', '=', userId)
      .where('status', 'in', OPEN_STATUSES)
      .forUpdate()
      .execute();
    for (const order of open) {
      await this.cancelInTransaction(
        trx,
        order.id,
        order.status,
        'SYSTEM',
        null,
        'Account deleted',
      );
    }
  }

  async list(userId: string, scope: OrdersScope, cursor: string | undefined): Promise<Page<Order>> {
    const now = new Date();
    const queryHash = this.cursors.queryHash({ scope });
    let query = orderRows(this.db)
      .where('o.user_id', '=', userId)
      .where('o.status', 'in', scope === 'upcoming' ? UPCOMING_STATUSES : PAST_STATUSES);

    // Upcoming: soonest pickup first. Past: newest first (UUIDv7 ids are time-ordered).
    if (scope === 'upcoming') {
      if (cursor) {
        const [start, id] = this.cursors.decode(cursor, queryHash);
        query = query.where(sql<boolean>`(o.pickup_start, o.id) > (${start}, ${id})`);
      }
      query = query.orderBy('o.pickup_start').orderBy('o.id');
    } else {
      if (cursor) {
        const [id] = this.cursors.decode(cursor, queryHash);
        query = query.where(sql<boolean>`o.id < ${id}`);
      }
      query = query.orderBy('o.id', 'desc');
    }

    const rows = await query.limit(PAGE_SIZE + 1).execute();
    const page = rows.slice(0, PAGE_SIZE);
    const items = await loadItems(
      this.db,
      page.map((r) => r.id),
    );
    const last = page[page.length - 1];
    const hasMore = rows.length > PAGE_SIZE && last !== undefined;
    const nextKey = last
      ? scope === 'upcoming'
        ? [last.pickup_start.toISOString(), last.id]
        : [last.id]
      : [];
    return {
      data: page.map((r) =>
        toOrder(
          r,
          items.filter((i) => i.order_id === r.id),
          this.config.appSecret,
          now,
        ),
      ),
      page: { nextCursor: hasMore ? this.cursors.encode(nextKey, queryHash) : null, hasMore },
    };
  }

  /** One review per collected order; the business rating aggregate updates in the same transaction. */
  async review(userId: string, orderId: string, input: ReviewRequest): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      const order = await trx
        .selectFrom('orders')
        .select(['id', 'status', 'business_id'])
        .where('id', '=', orderId)
        .where('user_id', '=', userId)
        .executeTakeFirst();
      if (!order) throw notFound('ORDER_NOT_FOUND', 'Order not found');
      if (order.status !== 'PICKED_UP')
        throw conflict('ORDER_INVALID_TRANSITION', 'Only collected orders can be rated');
      try {
        await trx
          .insertInto('reviews')
          .values({
            order_id: order.id,
            user_id: userId,
            business_id: order.business_id,
            rating: input.rating,
            comment: input.comment ?? null,
          })
          .execute();
      } catch (error) {
        if (isUniqueViolation(error, 'reviews_order_id_key')) {
          throw conflict('ORDER_INVALID_TRANSITION', 'This order was already rated');
        }
        throw error;
      }
      await trx
        .updateTable('businesses')
        .set({
          rating_sum: sql<number>`rating_sum + ${input.rating}`,
          rating_count: sql<number>`rating_count + 1`,
        })
        .where('id', '=', order.business_id)
        .execute();
    });
  }

  /**
   * Impact from collected orders. CO2e stays null until sourced factors exist (D8) — never invent.
   */
  async impact(userId: string): Promise<ImpactSummary> {
    const row = await this.db
      .selectFrom('orders as o')
      .innerJoin('order_items as i', 'i.order_id', 'o.id')
      .select([
        sql<number>`count(DISTINCT o.id)::int`.as('orders'),
        sql<number>`coalesce(sum(i.quantity), 0)::int`.as('items'),
        sql<number>`coalesce(sum(CASE WHEN i.reference_value_minor IS NULL THEN 0
          ELSE (i.reference_value_minor - i.unit_price_minor) * i.quantity END), 0)::bigint`.as(
          'saved',
        ),
      ])
      .where('o.user_id', '=', userId)
      .where('o.status', '=', 'PICKED_UP')
      .executeTakeFirstOrThrow();
    return {
      ordersCompleted: row.orders,
      itemsRescued: row.items,
      moneySaved: {
        amountMinor: Math.max(0, Number(row.saved)),
        currency: this.config.defaultCurrency,
      },
      co2eKg: null,
      methodology: null,
    };
  }
}
