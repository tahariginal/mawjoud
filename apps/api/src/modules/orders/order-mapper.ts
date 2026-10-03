import type { Order } from '@mazal/contracts';
import { type Kysely, sql, type Transaction } from 'kysely';

import { latitudeOf, longitudeOf } from '../../database/geo.ts';
import type { Database, OrderDbStatus } from '../../database/schema.ts';
import { pickupToken } from './pickup-token.ts';

type Executor = Kysely<Database> | Transaction<Database>;

const OPEN: OrderDbStatus[] = ['CONFIRMED', 'READY_FOR_PICKUP'];

/** Orders joined with their store, ready to map to the contract. */
export function orderRows(executor: Executor) {
  return executor
    .selectFrom('orders as o')
    .innerJoin('business_locations as l', 'l.id', 'o.location_id')
    .select([
      'o.id',
      'o.short_code',
      'o.user_id',
      'o.status',
      'o.payment_method',
      'o.subtotal_minor',
      'o.fees_minor',
      'o.discount_minor',
      'o.tax_minor',
      'o.total_minor',
      'o.currency',
      'o.pickup_start',
      'o.pickup_end',
      'o.pickup_timezone',
      'o.pickup_code',
      'o.picked_up_at',
      'o.cancelled_reason',
      'o.created_at',
      'l.id as location_id',
      'l.name as store_name',
      'l.address_line',
      'l.city',
      'l.postal_code',
      'l.country_code',
      latitudeOf(sql.ref('l.geog')).as('lat'),
      longitudeOf(sql.ref('l.geog')).as('lng'),
      sql<boolean>`EXISTS (SELECT 1 FROM reviews r WHERE r.order_id = o.id)`.as('reviewed'),
    ]);
}

type Row = Awaited<ReturnType<ReturnType<typeof orderRows>['executeTakeFirstOrThrow']>>;

export type OrderItemRow = {
  order_id: string;
  offer_id: string;
  title: string;
  quantity: number;
  unit_price_minor: number;
  reference_value_minor: number | null;
  currency: string;
};

export async function loadItems(executor: Executor, orderIds: string[]): Promise<OrderItemRow[]> {
  if (orderIds.length === 0) return [];
  return executor
    .selectFrom('order_items')
    .select([
      'order_id',
      'offer_id',
      'title',
      'quantity',
      'unit_price_minor',
      'reference_value_minor',
      'currency',
    ])
    .where('order_id', 'in', orderIds)
    .orderBy('id')
    .execute();
}

export function toOrder(row: Row, items: OrderItemRow[], secret: string, now: Date): Order {
  const money = (amountMinor: number) => ({ amountMinor, currency: row.currency });
  const open = OPEN.includes(row.status);
  const unit = items[0];
  return {
    id: row.id,
    shortCode: row.short_code,
    status: row.status,
    store: {
      id: row.location_id,
      name: row.store_name,
      address: {
        line1: row.address_line,
        city: row.city,
        postalCode: row.postal_code,
        countryCode: row.country_code,
      },
      location: { lat: row.lat, lng: row.lng },
      timezone: row.pickup_timezone,
    },
    items: items.map((i) => ({
      offerId: i.offer_id,
      title: i.title,
      quantity: i.quantity,
      unitPrice: { amountMinor: i.unit_price_minor, currency: i.currency },
      referenceValue:
        i.reference_value_minor === null
          ? null
          : { amountMinor: i.reference_value_minor, currency: i.currency },
    })),
    breakdown: {
      unitPrice: money(unit?.unit_price_minor ?? 0),
      subtotal: money(row.subtotal_minor),
      fees: money(row.fees_minor),
      discount: money(row.discount_minor),
      tax: money(row.tax_minor),
      total: money(row.total_minor),
    },
    pickup: {
      start: row.pickup_start.toISOString(),
      end: row.pickup_end.toISOString(),
      timezone: row.pickup_timezone,
    },
    paymentMethod: row.payment_method,
    // The pass is only shown while the order can still be collected.
    pickupPass: open ? { token: pickupToken(secret, row.id), code: row.pickup_code } : null,
    pickedUpAt: row.picked_up_at ? row.picked_up_at.toISOString() : null,
    // Cancellation policy placeholder (D7): until the pickup window starts.
    cancellable: row.status === 'CONFIRMED' && now.getTime() < row.pickup_start.getTime(),
    cancelledReason: row.cancelled_reason,
    reviewable: row.status === 'PICKED_UP' && !row.reviewed,
    createdAt: row.created_at.toISOString(),
  };
}
