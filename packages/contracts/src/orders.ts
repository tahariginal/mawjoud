import { z } from 'zod';

import { GeoPoint, IsoDateTime, Money, Uuid } from './common.ts';
import { Address, PickupWindow } from './discovery.ts';
import { OrderStatus, PaymentStatus } from './enums.ts';

export const MAX_QUANTITY_PER_ORDER = 20;

export const QuoteRequest = z.strictObject({
  offerId: Uuid,
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ORDER),
});
export type QuoteRequest = z.infer<typeof QuoteRequest>;

export const PriceBreakdown = z.object({
  unitPrice: Money,
  subtotal: Money,
  fees: Money,
  discount: Money,
  tax: Money,
  total: Money,
});
export type PriceBreakdown = z.infer<typeof PriceBreakdown>;

/** Server-calculated price. The client displays it; it never computes totals itself. */
export const Quote = z.object({
  offerId: Uuid,
  quantity: z.number().int().positive(),
  breakdown: PriceBreakdown,
  quoteVersion: z.string(),
  holdMinutes: z.number().int().positive(),
});
export type Quote = z.infer<typeof Quote>;

export const CreateOrderRequest = z.strictObject({
  offerId: Uuid,
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ORDER),
  quoteVersion: z.string().optional(),
});
export type CreateOrderRequest = z.infer<typeof CreateOrderRequest>;

/**
 * How the app should collect payment. The real provider is pending (docs ADR-006).
 * DEV_SIMULATOR exists only for development and is rejected by production builds.
 */
export const PaymentClientParams = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('HOSTED_PAGE'), url: z.url(), returnUrl: z.string() }),
  z.object({ kind: z.literal('NATIVE_SHEET'), provider: z.string(), clientSecret: z.string() }),
  z.object({ kind: z.literal('DEV_SIMULATOR') }),
]);
export type PaymentClientParams = z.infer<typeof PaymentClientParams>;

export const OrderItem = z.object({
  offerId: Uuid,
  title: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: Money,
  referenceValue: Money.nullable(),
});
export type OrderItem = z.infer<typeof OrderItem>;

export const PickupPass = z.object({
  /** Opaque token rendered as a QR code. */
  token: z.string().min(16),
  /** Short fallback code typed by staff. */
  code: z.string().regex(/^[A-Z0-9]{6}$/),
});
export type PickupPass = z.infer<typeof PickupPass>;

export const Order = z.object({
  id: Uuid,
  shortCode: z.string(),
  status: OrderStatus,
  store: z.object({
    id: Uuid,
    name: z.string(),
    address: Address,
    location: GeoPoint,
    timezone: z.string(),
  }),
  items: z.array(OrderItem).min(1),
  breakdown: PriceBreakdown,
  pickup: PickupWindow,
  holdExpiresAt: IsoDateTime.nullable(),
  payment: z.object({ status: PaymentStatus, refunded: Money.nullable() }).nullable(),
  pickupPass: PickupPass.nullable(),
  pickedUpAt: IsoDateTime.nullable(),
  cancellable: z.boolean(),
  cancelledReason: z.string().nullable(),
  reviewable: z.boolean(),
  createdAt: IsoDateTime,
});
export type Order = z.infer<typeof Order>;

export const CreateOrderResponse = z.object({
  order: Order,
  payment: PaymentClientParams,
});
export type CreateOrderResponse = z.infer<typeof CreateOrderResponse>;

export const CancelOrderRequest = z.strictObject({
  reason: z.string().trim().max(300).optional(),
});
export type CancelOrderRequest = z.infer<typeof CancelOrderRequest>;

export const ReviewRequest = z.strictObject({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});
export type ReviewRequest = z.infer<typeof ReviewRequest>;

export const OrdersScope = z.enum(['upcoming', 'past']);
export type OrdersScope = z.infer<typeof OrdersScope>;
