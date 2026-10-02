import type { OrderStatus } from './enums.ts';

/**
 * Legal order transitions. Source: docs/DATABASE_DESIGN.md §4.1.
 * The API enforces these with guarded SQL updates; clients never send a status.
 */
const TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  // CREATED -> CONFIRMED: reservation without online payment (pay at pickup, ADR-015).
  CREATED: ['CONFIRMED', 'PAYMENT_PENDING', 'EXPIRED', 'FAILED'],
  PAYMENT_PENDING: ['CONFIRMED', 'EXPIRED', 'FAILED', 'CANCELLED'],
  CONFIRMED: ['READY_FOR_PICKUP', 'PICKED_UP', 'CANCELLED', 'NO_SHOW'],
  READY_FOR_PICKUP: ['PICKED_UP', 'CANCELLED', 'NO_SHOW'],
  PICKED_UP: [],
  CANCELLED: [],
  EXPIRED: [],
  FAILED: [],
  NO_SHOW: [],
};

export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = [
  'PICKED_UP',
  'CANCELLED',
  'EXPIRED',
  'FAILED',
  'NO_SHOW',
];

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedOrderTransitions(from: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[from];
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.includes(status);
}

/** Orders a customer should see under "Upcoming". */
export function isUpcomingOrderStatus(status: OrderStatus): boolean {
  return (
    status === 'CREATED' ||
    status === 'PAYMENT_PENDING' ||
    status === 'CONFIRMED' ||
    status === 'READY_FOR_PICKUP'
  );
}
