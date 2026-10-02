import { type Me, NotificationPreferences, type UpdateMeRequest } from '@mawjood/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type { Kysely, Transaction } from 'kysely';

import { DB, type Db } from '../../database/db.ts';
import type { Database } from '../../database/schema.ts';
import { AppError, unauthorized } from '../../shared/errors/app-error.ts';
import { verifyPassword } from './passwords.ts';
import { SessionsService } from './sessions.service.ts';

type Executor = Kysely<Database> | Transaction<Database>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  types: {
    FAVORITE_AVAILABLE: { push: true, email: false },
    ORDER_UPDATES: { push: true, email: true },
    PICKUP_REMINDERS: { push: true, email: false },
    MARKETING: { push: false, email: false },
  },
  quietHours: { enabled: true, start: '22:00', end: '08:00' },
  maxFavoriteAlertsPerDay: 2,
};

/** Hooks other modules register to clean up their data when an account is deleted. */
export type AccountDeletionHook = (trx: Transaction<Database>, userId: string) => Promise<void>;

/** The signed-in user's own account: profile, preferences, deletion. */
@Injectable()
export class AccountService {
  private readonly deletionHooks: AccountDeletionHook[] = [];

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(SessionsService) private readonly sessions: SessionsService,
  ) {}

  registerDeletionHook(hook: AccountDeletionHook): void {
    this.deletionHooks.push(hook);
  }

  async getMe(userId: string, executor: Executor = this.db): Promise<Me> {
    const user = await executor
      .selectFrom('users')
      .select([
        'id',
        'email',
        'email_verified_at',
        'display_name',
        'locale',
        'platform_role',
        'status',
      ])
      .where('id', '=', userId)
      .executeTakeFirst();
    if (!user || user.status !== 'ACTIVE') {
      throw unauthorized('AUTH_SESSION_REVOKED', 'Account is not active');
    }
    const memberships = await executor
      .selectFrom('business_members')
      .innerJoin('businesses', 'businesses.id', 'business_members.business_id')
      .select([
        'businesses.id as businessId',
        'businesses.name as businessName',
        'business_members.role',
      ])
      .where('business_members.user_id', '=', userId)
      .where('businesses.status', 'in', ['PENDING_REVIEW', 'ACTIVE'])
      .orderBy('businesses.created_at')
      .execute();
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified_at !== null,
      displayName: user.display_name,
      locale: user.locale,
      platformRole: user.platform_role,
      memberships,
    };
  }

  async updateMe(userId: string, input: UpdateMeRequest): Promise<Me> {
    if (input.displayName !== undefined || input.locale !== undefined) {
      await this.db
        .updateTable('users')
        .set({
          ...(input.displayName !== undefined ? { display_name: input.displayName } : {}),
          ...(input.locale !== undefined ? { locale: input.locale } : {}),
        })
        .where('id', '=', userId)
        .where('status', '=', 'ACTIVE')
        .execute();
    }
    return this.getMe(userId);
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const row = await this.db
      .selectFrom('users')
      .select('notification_preferences')
      .where('id', '=', userId)
      .executeTakeFirstOrThrow();
    const parsed = NotificationPreferences.safeParse(row.notification_preferences);
    return parsed.success ? parsed.data : DEFAULT_NOTIFICATION_PREFERENCES;
  }

  async setNotificationPreferences(
    userId: string,
    prefs: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    await this.db
      .updateTable('users')
      .set({ notification_preferences: JSON.stringify(prefs) })
      .where('id', '=', userId)
      .execute();
    return prefs;
  }

  /**
   * In-app account deletion (App Store 5.1.1(v); docs/SECURITY_MODEL.md §8): re-authenticate,
   * anonymise personal data, revoke sessions and let modules clean up, all in one transaction.
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.db
      .selectFrom('users')
      .select(['password_hash', 'status'])
      .where('id', '=', userId)
      .executeTakeFirst();
    if (!user || user.status === 'DELETED')
      throw unauthorized('AUTH_SESSION_REVOKED', 'Account is not active');
    if (!(await verifyPassword(user.password_hash, password))) {
      throw new AppError('AUTH_INVALID_CREDENTIALS', 401, 'Password is incorrect');
    }

    const ownsBusiness = await this.db
      .selectFrom('business_members')
      .innerJoin('businesses', 'businesses.id', 'business_members.business_id')
      .select('businesses.id')
      .where('business_members.user_id', '=', userId)
      .where('business_members.role', '=', 'OWNER')
      .where('businesses.status', 'in', ['PENDING_REVIEW', 'ACTIVE'])
      .executeTakeFirst();
    if (ownsBusiness) {
      // A business must be transferred or closed first so stores are never left without an owner.
      throw new AppError(
        'FORBIDDEN',
        403,
        'Close or transfer your business before deleting your account',
        {
          reason: 'OWNS_BUSINESS',
        },
      );
    }

    await this.db.transaction().execute(async (trx) => {
      for (const hook of this.deletionHooks) await hook(trx, userId);
      await trx.deleteFrom('business_members').where('user_id', '=', userId).execute();
      await trx.deleteFrom('verification_codes').where('user_id', '=', userId).execute();
      await this.sessions.revokeAllForUser(trx, userId);
      await trx
        .updateTable('users')
        .set({
          email: `deleted+${userId}@invalid.mawjood`,
          email_verified_at: null,
          password_hash: null,
          display_name: 'Deleted user',
          notification_preferences: null,
          status: 'DELETED',
          deleted_at: new Date(),
        })
        .where('id', '=', userId)
        .execute();
    });
  }
}
