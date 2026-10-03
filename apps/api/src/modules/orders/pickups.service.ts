import type {
  MerchantInsights,
  MerchantOrder,
  PickupValidateRequest,
  PickupValidateResult,
} from '@mazal/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { sql, type Transaction } from 'kysely';

import { APP_CONFIG, type AppConfig } from '../../config/config.ts';
import { DB, type Db } from '../../database/db.ts';
import { isUniqueViolation } from '../../database/errors.ts';
import type { Database, OrderDbStatus } from '../../database/schema.ts';
import { AppError, conflict, notFound } from '../../shared/errors/app-error.ts';
import { IdempotencyService } from '../../shared/idempotency/idempotency.ts';
import { MerchantAccessService } from '../merchants/merchant-access.service.ts';
import { verifyPickupToken } from './pickup-token.ts';

/** Staff may hand over until 30 minutes after the window (docs/PRODUCT_REQUIREMENTS.md §6). */
export const PICKUP_GRACE_MS = 30 * 60_000;
const FAILED_ATTEMPT_WINDOW_MS = 5 * 60_000;
const MAX_FAILED_ATTEMPTS = 10;

type Tx = Transaction<Database>;
type Resolved = { orderId: string; method: 'QR' | 'CODE' };

const invalidCode = () => notFound('PICKUP_CODE_INVALID', 'Code not recognized for this store');

/** Outcome recorded in pickup_attempts (fraud monitoring, docs/SECURITY_MODEL.md §7). */
function attemptResult(error: unknown): string {
  return error instanceof AppError ? error.code : 'ERROR';
}

@Injectable()
export class PickupsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(MerchantAccessService) private readonly access: MerchantAccessService,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
  ) {}

  /**
   * Validates a pickup exactly once (ADR-012, CS-10): order row locked, guarded status update and a
   * unique pickup row in one transaction. Any business the staff member does not belong to sees
   * PICKUP_CODE_INVALID — never whether the code exists elsewhere.
   */
  async validate(
    staffId: string,
    input: PickupValidateRequest,
    idempotencyKey: string,
  ): Promise<PickupValidateResult> {
    const locationId = 'locationId' in input ? input.locationId : null;
    if (locationId) {
      const member = await this.access
        .location(staffId, locationId, ['OWNER', 'STAFF'])
        .then(() => true)
        .catch(() => false);
      if (!member) {
        // Not attributed to the store: outsiders must not be able to trigger its lockout.
        await this.recordAttempt(null, staffId, 'PICKUP_CODE_INVALID');
        throw invalidCode();
      }
      await this.checkLockout(locationId);
    }

    try {
      const result = await this.idempotency.execute(
        staffId,
        'pickups.validate',
        idempotencyKey,
        input,
        async (trx) => {
          const resolved = await this.resolve(trx, input);
          return this.complete(trx, staffId, resolved);
        },
      );
      await this.recordAttempt(result.order.id, staffId, 'VALIDATED');
      return result;
    } catch (error) {
      await this.recordAttempt(null, staffId, attemptResult(error), locationId);
      throw error;
    }
  }

  private async checkLockout(locationId: string): Promise<void> {
    const recent = await this.db
      .selectFrom('pickup_attempts')
      .select(sql<number>`count(*)::int`.as('n'))
      .where('location_id', '=', locationId)
      .where('result', '=', 'PICKUP_CODE_INVALID')
      .where('created_at', '>', new Date(Date.now() - FAILED_ATTEMPT_WINDOW_MS))
      .executeTakeFirstOrThrow();
    if (recent.n >= MAX_FAILED_ATTEMPTS) {
      throw new AppError('RATE_LIMITED', 429, 'Too many invalid codes; try again in a few minutes');
    }
  }

  private async recordAttempt(
    orderId: string | null,
    staffId: string,
    result: string,
    locationId: string | null = null,
  ): Promise<void> {
    const location =
      locationId ??
      (orderId
        ? ((
            await this.db
              .selectFrom('orders')
              .select('location_id')
              .where('id', '=', orderId)
              .executeTakeFirst()
          )?.location_id ?? null)
        : null);
    await this.db
      .insertInto('pickup_attempts')
      .values({ location_id: location, staff_user_id: staffId, result })
      .execute()
      .catch(() => undefined); // Monitoring must never break the counter flow.
  }

  private async resolve(trx: Tx, input: PickupValidateRequest): Promise<Resolved> {
    if ('token' in input) {
      const orderId = verifyPickupToken(this.config.appSecret, input.token);
      if (!orderId) throw invalidCode();
      return { orderId, method: 'QR' };
    }
    // Codes are unique among open orders per store; after pickup the newest match tells
    // the staff it was already collected.
    const row = await trx
      .selectFrom('orders')
      .select('id')
      .where('location_id', '=', input.locationId)
      .where('pickup_code', '=', input.code)
      .orderBy(sql`CASE WHEN status IN ('CONFIRMED', 'READY_FOR_PICKUP') THEN 0 ELSE 1 END`)
      .orderBy('created_at', 'desc')
      .limit(1)
      .executeTakeFirst();
    if (!row) throw invalidCode();
    return { orderId: row.id, method: 'CODE' };
  }

  private async complete(
    trx: Tx,
    staffId: string,
    resolved: Resolved,
  ): Promise<PickupValidateResult> {
    const order = await trx
      .selectFrom('orders as o')
      .innerJoin('business_members as m', (join) =>
        join.onRef('m.business_id', '=', 'o.business_id').on('m.user_id', '=', staffId),
      )
      .select([
        'o.id',
        'o.status',
        'o.location_id',
        'o.pickup_start',
        'o.pickup_end',
        'o.picked_up_at',
      ])
      .where('o.id', '=', resolved.orderId)
      .forUpdate('o')
      .executeTakeFirst();
    if (!order) throw invalidCode();

    if (order.status === 'PICKED_UP') {
      throw conflict('PICKUP_ALREADY_COMPLETED', 'Already collected', {
        pickedUpAt: order.picked_up_at?.toISOString() ?? null,
      });
    }
    if (order.status !== 'CONFIRMED' && order.status !== 'READY_FOR_PICKUP') {
      throw conflict('PICKUP_ORDER_CANCELLED', 'Order is not collectable', {
        status: order.status,
      });
    }
    const now = Date.now();
    if (now < order.pickup_start.getTime()) {
      throw conflict('PICKUP_NOT_YET_OPEN', 'Pickup window not open yet', {
        start: order.pickup_start.toISOString(),
      });
    }
    if (now > order.pickup_end.getTime() + PICKUP_GRACE_MS) {
      throw conflict('PICKUP_WINDOW_CLOSED', 'Pickup window closed');
    }

    const pickedUpAt = new Date();
    const updated = await trx
      .updateTable('orders')
      .set({ status: 'PICKED_UP', picked_up_at: pickedUpAt })
      .where('id', '=', order.id)
      .where('status', 'in', ['CONFIRMED', 'READY_FOR_PICKUP'])
      .executeTakeFirst();
    if (Number(updated.numUpdatedRows) !== 1)
      throw conflict('PICKUP_ALREADY_COMPLETED', 'Already collected');
    try {
      await trx
        .insertInto('pickups')
        .values({
          order_id: order.id,
          location_id: order.location_id,
          validated_by: staffId,
          method: resolved.method,
          validated_at: pickedUpAt,
        })
        .execute();
    } catch (error) {
      // Database-level guarantee of a single pickup per order.
      if (isUniqueViolation(error, 'pickups_order_id_key'))
        throw conflict('PICKUP_ALREADY_COMPLETED', 'Already collected');
      throw error;
    }
    await trx
      .insertInto('order_status_history')
      .values({
        order_id: order.id,
        from_status: order.status,
        to_status: 'PICKED_UP',
        actor_type: 'MERCHANT',
        actor_id: staffId,
      })
      .execute();

    const [merchantOrder] = await this.merchantOrders(trx).where('o.id', '=', order.id).execute();
    if (!merchantOrder) throw new Error('Validated order disappeared');
    return {
      result: 'VALIDATED',
      order: toMerchantOrder(merchantOrder),
      validatedAt: pickedUpAt.toISOString(),
    };
  }

  private merchantOrders(executor: Db | Tx) {
    return executor
      .selectFrom('orders as o')
      .innerJoin('users as u', 'u.id', 'o.user_id')
      .select([
        'o.id',
        'o.short_code',
        'o.status',
        'o.pickup_start',
        'o.pickup_end',
        'o.pickup_timezone',
        'o.picked_up_at',
        // Data minimisation: staff only see the first letter of the customer's name.
        sql<string>`upper(left(u.display_name, 1))`.as('initial'),
        sql<string>`(SELECT string_agg(i.title, ', ' ORDER BY i.id) FROM order_items i WHERE i.order_id = o.id)`.as(
          'title',
        ),
        sql<number>`(SELECT coalesce(sum(i.quantity), 0)::int FROM order_items i WHERE i.order_id = o.id)`.as(
          'quantity',
        ),
      ]);
  }

  /** Today's pickups at a store (in the store's timezone), for owners and staff. */
  async todaysOrders(userId: string, locationId: string): Promise<MerchantOrder[]> {
    await this.access.location(userId, locationId, ['OWNER', 'STAFF']);
    const statuses: OrderDbStatus[] = ['CONFIRMED', 'READY_FOR_PICKUP', 'PICKED_UP'];
    const rows = await this.merchantOrders(this.db)
      .innerJoin('business_locations as l', 'l.id', 'o.location_id')
      .where('o.location_id', '=', locationId)
      .where('o.status', 'in', statuses)
      .where(
        sql<boolean>`(o.pickup_start AT TIME ZONE l.timezone)::date = (now() AT TIME ZONE l.timezone)::date`,
      )
      .orderBy('o.pickup_start')
      .orderBy('o.id')
      .limit(500)
      .execute();
    return rows.map(toMerchantOrder);
  }

  /** Last 30 days for an owner (docs/PRODUCT_REQUIREMENTS.md M-09). */
  async insights(userId: string, businessId: string): Promise<MerchantInsights> {
    await this.access.business(userId, businessId, ['OWNER']);
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 3_600_000);
    const [orders, stock] = await Promise.all([
      this.db
        .selectFrom('orders as o')
        .select([
          sql<number>`coalesce(sum(o.total_minor) FILTER (WHERE o.status = 'PICKED_UP'), 0)::bigint`.as(
            'revenue',
          ),
          sql<number>`count(*) FILTER (WHERE o.status = 'PICKED_UP')::int`.as('completed'),
          sql<number>`count(*) FILTER (WHERE o.status = 'NO_SHOW')::int`.as('no_show'),
          sql<number>`coalesce((SELECT sum(i.quantity) FROM order_items i JOIN orders x ON x.id = i.order_id
             WHERE x.business_id = ${businessId} AND x.status = 'PICKED_UP'
               AND x.pickup_start >= ${from} AND x.pickup_start < ${to}), 0)::int`.as('items'),
        ])
        .where('o.business_id', '=', businessId)
        .where('o.pickup_start', '>=', from)
        .where('o.pickup_start', '<', to)
        .executeTakeFirstOrThrow(),
      this.db
        .selectFrom('offers as o')
        .innerJoin('offer_inventory as i', 'i.offer_id', 'o.id')
        .select([
          sql<number>`coalesce(sum(i.quantity_total), 0)::int`.as('total'),
          sql<number>`coalesce(sum(i.quantity_total - i.quantity_available), 0)::int`.as('taken'),
        ])
        .where('o.business_id', '=', businessId)
        .where('o.pickup_end', '>=', from)
        .where('o.pickup_end', '<', to)
        .where('o.status', '<>', 'REMOVED')
        .executeTakeFirstOrThrow(),
    ]);
    const settled = orders.completed + orders.no_show;
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      revenue: { amountMinor: Number(orders.revenue), currency: this.config.defaultCurrency },
      ordersCompleted: orders.completed,
      itemsRescued: orders.items,
      sellThroughRate: stock.total > 0 ? stock.taken / stock.total : null,
      noShowRate: settled > 0 ? orders.no_show / settled : null,
    };
  }
}

type MerchantOrderRow = {
  id: string;
  short_code: string;
  status: OrderDbStatus;
  pickup_start: Date;
  pickup_end: Date;
  pickup_timezone: string;
  picked_up_at: Date | null;
  initial: string;
  title: string;
  quantity: number;
};

function toMerchantOrder(row: MerchantOrderRow): MerchantOrder {
  return {
    id: row.id,
    shortCode: row.short_code,
    status: row.status,
    customerInitial: row.initial,
    offerTitle: row.title,
    quantity: row.quantity,
    pickup: {
      start: row.pickup_start.toISOString(),
      end: row.pickup_end.toISOString(),
      timezone: row.pickup_timezone,
    },
    pickedUpAt: row.picked_up_at ? row.picked_up_at.toISOString() : null,
  };
}
