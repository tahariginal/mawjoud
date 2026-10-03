import type {
  InviteStaffRequest,
  MerchantApplicationRequest,
  MerchantBusiness,
  SetBusinessHoursRequest,
  StaffMember,
} from '@mazal/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';

import { APP_CONFIG, type AppConfig } from '../../config/config.ts';
import { DB, type Db } from '../../database/db.ts';
import { geographyPoint, latitudeOf, longitudeOf } from '../../database/geo.ts';
import { AppError, notFound } from '../../shared/errors/app-error.ts';
import { MerchantAccessService } from './merchant-access.service.ts';

const hhmm = (time: string) => time.slice(0, 5);

@Injectable()
export class MerchantsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(MerchantAccessService) private readonly access: MerchantAccessService,
  ) {}

  /** Creates the business (pending review), its first store and the owner membership. */
  async apply(userId: string, input: MerchantApplicationRequest): Promise<void> {
    const category = await this.db
      .selectFrom('categories')
      .select('id')
      .where('id', '=', input.categoryId)
      .where('active', '=', true)
      .executeTakeFirst();
    if (!category) {
      throw new AppError('VALIDATION_FAILED', 400, 'Unknown category', {
        fields: [{ path: 'categoryId' }],
      });
    }
    const pending = await this.db
      .selectFrom('business_members')
      .innerJoin('businesses', 'businesses.id', 'business_members.business_id')
      .select('businesses.id')
      .where('business_members.user_id', '=', userId)
      .where('businesses.status', '=', 'PENDING_REVIEW')
      .executeTakeFirst();
    if (pending) {
      throw new AppError('VALIDATION_FAILED', 409, 'An application is already under review', {
        reason: 'APPLICATION_PENDING',
      });
    }

    await this.db.transaction().execute(async (trx) => {
      const business = await trx
        .insertInto('businesses')
        .values({
          name: input.businessName,
          legal_name: input.legalName,
          category_id: input.categoryId,
          contact_email: input.contactEmail,
          phone: input.phone,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      await trx
        .insertInto('business_locations')
        .values({
          business_id: business.id,
          name: input.businessName,
          address_line: input.addressLine,
          city: input.city,
          geog: geographyPoint(input.location),
          timezone: this.config.defaultTimezone,
          phone: input.phone,
        })
        .execute();
      await trx
        .insertInto('business_members')
        .values({ business_id: business.id, user_id: userId, role: 'OWNER' })
        .execute();
    });
  }

  async listBusinesses(userId: string): Promise<MerchantBusiness[]> {
    const businesses = await this.db
      .selectFrom('business_members')
      .innerJoin('businesses', 'businesses.id', 'business_members.business_id')
      .select(['businesses.id', 'businesses.name', 'businesses.status', 'business_members.role'])
      .where('business_members.user_id', '=', userId)
      .where('businesses.status', 'in', ['PENDING_REVIEW', 'ACTIVE', 'SUSPENDED'])
      .orderBy('businesses.created_at')
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
        'l.timezone',
        latitudeOf(sql.ref('l.geog')).as('lat'),
        longitudeOf(sql.ref('l.geog')).as('lng'),
      ])
      .where(
        'l.business_id',
        'in',
        businesses.map((b) => b.id),
      )
      .orderBy('l.created_at')
      .execute();
    const hours = locations.length
      ? await this.db
          .selectFrom('business_hours')
          .selectAll()
          .where(
            'location_id',
            'in',
            locations.map((l) => l.id),
          )
          .orderBy('weekday')
          .execute()
      : [];

    return businesses.map((b) => ({
      id: b.id,
      name: b.name,
      status: b.status,
      role: b.role,
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
          timezone: l.timezone,
          hours: hours
            .filter((h) => h.location_id === l.id)
            .map((h) => ({
              weekday: h.weekday,
              opensAt: hhmm(h.opens_at),
              closesAt: hhmm(h.closes_at),
            })),
        })),
    }));
  }

  async setHours(
    userId: string,
    locationId: string,
    hours: SetBusinessHoursRequest,
  ): Promise<void> {
    await this.access.location(userId, locationId, ['OWNER']);
    await this.db.transaction().execute(async (trx) => {
      await trx.deleteFrom('business_hours').where('location_id', '=', locationId).execute();
      if (hours.length > 0) {
        await trx
          .insertInto('business_hours')
          .values(
            hours.map((h) => ({
              location_id: locationId,
              weekday: h.weekday,
              opens_at: h.opensAt,
              closes_at: h.closesAt,
            })),
          )
          .execute();
      }
    });
  }

  async listStaff(userId: string, businessId: string): Promise<StaffMember[]> {
    await this.access.business(userId, businessId, ['OWNER']);
    return this.db
      .selectFrom('business_members')
      .innerJoin('users', 'users.id', 'business_members.user_id')
      .select([
        'users.id as userId',
        'users.display_name as displayName',
        'users.email',
        'business_members.role',
      ])
      .where('business_members.business_id', '=', businessId)
      .orderBy('business_members.role')
      .orderBy('business_members.created_at')
      .execute();
  }

  /**
   * Adds an existing Mazal user as staff. Unknown emails answer 404: email invitations for
   * people without an account come with notifications (Phase 7).
   */
  async inviteStaff(userId: string, businessId: string, input: InviteStaffRequest): Promise<void> {
    await this.access.business(userId, businessId, ['OWNER']);
    const invitee = await this.db
      .selectFrom('users')
      .select('id')
      .where('email', '=', input.email)
      .where('status', '=', 'ACTIVE')
      .executeTakeFirst();
    if (!invitee) throw notFound('NOT_FOUND', 'No active account with this email');
    await this.db
      .insertInto('business_members')
      .values({ business_id: businessId, user_id: invitee.id, role: 'STAFF' })
      .onConflict((oc) => oc.columns(['business_id', 'user_id']).doNothing())
      .execute();
  }
}
