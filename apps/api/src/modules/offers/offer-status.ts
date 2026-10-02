import type { OfferStatus } from '@mawjood/contracts';

import type { OfferDbStatus } from '../../database/schema.ts';

/**
 * Status shown to clients. The database stores only the lifecycle the merchant controls
 * (ACTIVE / PAUSED / ENDED / REMOVED); SOLD_OUT and time-based ENDED are derived from stock and
 * the clock so they can never be stale.
 */
export function displayOfferStatus(
  dbStatus: OfferDbStatus,
  quantityAvailable: number,
  pickupEnd: Date,
  now: Date,
): OfferStatus {
  if (dbStatus === 'REMOVED') return 'REMOVED';
  if (dbStatus === 'ENDED' || pickupEnd.getTime() <= now.getTime()) return 'ENDED';
  if (dbStatus === 'DRAFT') return 'DRAFT';
  if (dbStatus === 'PAUSED') return 'PAUSED';
  return quantityAvailable > 0 ? 'ACTIVE' : 'SOLD_OUT';
}
