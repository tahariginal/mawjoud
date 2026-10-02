import { z } from 'zod';

import { GeoPoint, IsoDateTime, Uuid } from './common.ts';
import { Address } from './discovery.ts';
import { BusinessStatus } from './enums.ts';

export const AdminBusiness = z.object({
  id: Uuid,
  name: z.string(),
  legalName: z.string(),
  status: BusinessStatus,
  contactEmail: z.string(),
  phone: z.string(),
  createdAt: IsoDateTime,
  locations: z.array(
    z.object({ id: Uuid, name: z.string(), address: Address, location: GeoPoint }),
  ),
});
export type AdminBusiness = z.infer<typeof AdminBusiness>;

/** Every admin mutation records a reason in the audit log (docs/SECURITY_MODEL.md §3). */
export const AdminDecisionRequest = z.strictObject({
  reason: z.string().trim().min(3).max(300),
});
export type AdminDecisionRequest = z.infer<typeof AdminDecisionRequest>;

export const AdminBusinessQuery = z.strictObject({
  status: BusinessStatus.default('PENDING_REVIEW'),
});
export type AdminBusinessQuery = z.input<typeof AdminBusinessQuery>;
