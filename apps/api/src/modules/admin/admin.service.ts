import type { AdminBusiness, BusinessStatus } from '@mawjood/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';

import { DB, type Db } from '../../database/db.ts';
import { latitudeOf, longitudeOf } from '../../database/geo.ts';
import { conflict, notFound } from '../../shared/errors/app-error.ts';

type Decision = 'approve' | 'reject' | 'suspend';

const TRANSITIONS: Record<Decision, { from: BusinessStatus[]; to: BusinessStatus }> = {
  approve: { from: ['PENDING_REVIEW', 'SUSPENDED'], to: 'ACTIVE' },
  reject: { from: ['PENDING_REVIEW'], to: 'REJECTED' },
  suspend: { from: ['ACTIVE'], to: 'SUSPENDED' },
};

@Injectable()
export class AdminService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async listBusinesses(status: BusinessStatus): Promise<AdminBusiness[]> {
    const businesses = await this.db
      .selectFrom('businesses')
      .select(['id', 'name', 'legal_name', 'status', 'contact_email', 'phone', 'created_at'])
      .where('status', '=', status)
      .orderBy('created_at')
      .limit(200)
      .execute();
    if (businesses.length === 0) return [];
    const locations = await this.db
      .selectFrom('business_locations as l')
      .select([
        'l.id',
        'l.business_id',
        'l.name',
        'l.address_line',
        'l.city',
        'l.postal_code',
        'l.country_code',
        latitudeOf(sql.ref('l.geog')).as('lat'),
        longitudeOf(sql.ref('l.geog')).as('lng'),
      ])
      .where(
        'l.business_id',
        'in',
        businesses.map((b) => b.id),
      )
      .execute();
    return businesses.map((b) => ({
      id: b.id,
      name: b.name,
      legalName: b.legal_name,
      status: b.status,
      contactEmail: b.contact_email,
      phone: b.phone,
      createdAt: b.created_at.toISOString(),
      locations: locations
        .filter((l) => l.business_id === b.id)
        .map((l) => ({
          id: l.id,
          name: l.name,
          address: {
            line1: l.address_line,
            city: l.city,
            postalCode: l.postal_code,
            countryCode: l.country_code,
          },
          location: { lat: l.lat, lng: l.lng },
        })),
    }));
  }

  /** Status change and its audit record commit together (docs/SECURITY_MODEL.md §3). */
  async decide(
    adminId: string,
    businessId: string,
    decision: Decision,
    reason: string,
    requestId: string,
  ): Promise<void> {
    const { from, to } = TRANSITIONS[decision];
    await this.db.transaction().execute(async (trx) => {
      const current = await trx
        .selectFrom('businesses')
        .select('status')
        .where('id', '=', businessId)
        .forUpdate()
        .executeTakeFirst();
      if (!current) throw notFound();
      if (!from.includes(current.status)) {
        throw conflict(
          'INVALID_STATE_TRANSITION',
          `Cannot ${decision} a business in status ${current.status}`,
        );
      }
      await trx
        .updateTable('businesses')
        .set({ status: to })
        .where('id', '=', businessId)
        .execute();
      await trx
        .insertInto('audit_logs')
        .values({
          actor_user_id: adminId,
          action: `business.${decision}`,
          entity_type: 'business',
          entity_id: businessId,
          before: JSON.stringify({ status: current.status }),
          after: JSON.stringify({ status: to }),
          reason,
          request_id: requestId,
        })
        .execute();
    });
  }
}
