import type { BusinessRole } from '@mawjood/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { DB, type Db } from '../../database/db.ts';
import type { BusinessStatus } from '../../database/schema.ts';
import { AppError, notFound } from '../../shared/errors/app-error.ts';

export type BusinessAccess = { businessId: string; role: BusinessRole; status: BusinessStatus };
export type LocationAccess = BusinessAccess & { locationId: string; timezone: string };

/**
 * Resource-level authorisation for merchant routes (docs/SECURITY_MODEL.md §3): membership and
 * role are checked in the query. Not-a-member and not-found both answer 404 (no existence leak).
 */
@Injectable()
export class MerchantAccessService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async business(
    userId: string,
    businessId: string,
    roles: readonly BusinessRole[],
  ): Promise<BusinessAccess> {
    const row = await this.db
      .selectFrom('business_members')
      .innerJoin('businesses', 'businesses.id', 'business_members.business_id')
      .select(['businesses.id as businessId', 'business_members.role', 'businesses.status'])
      .where('business_members.user_id', '=', userId)
      .where('business_members.business_id', '=', businessId)
      .executeTakeFirst();
    if (!row || !roles.includes(row.role)) throw notFound();
    return row;
  }

  async location(
    userId: string,
    locationId: string,
    roles: readonly BusinessRole[],
  ): Promise<LocationAccess> {
    const row = await this.db
      .selectFrom('business_locations')
      .innerJoin(
        'business_members',
        'business_members.business_id',
        'business_locations.business_id',
      )
      .innerJoin('businesses', 'businesses.id', 'business_locations.business_id')
      .select([
        'business_locations.id as locationId',
        'business_locations.timezone',
        'businesses.id as businessId',
        'businesses.status',
        'business_members.role',
      ])
      .where('business_members.user_id', '=', userId)
      .where('business_locations.id', '=', locationId)
      .executeTakeFirst();
    if (!row || !roles.includes(row.role)) throw notFound();
    return row;
  }

  /** Selling requires an approved business. */
  static requireActive(access: BusinessAccess): void {
    if (access.status !== 'ACTIVE') {
      throw new AppError('BUSINESS_NOT_ACTIVE', 403, 'Business is not active', {
        status: access.status,
      });
    }
  }
}
