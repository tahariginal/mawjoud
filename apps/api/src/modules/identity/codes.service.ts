import { Inject, Injectable } from '@nestjs/common';
import type { Kysely, Transaction } from 'kysely';

import { APP_CONFIG, type AppConfig } from '../../config/config.ts';
import { DB, type Db } from '../../database/db.ts';
import type { Database } from '../../database/schema.ts';
import { hmac, oneTimeCode, safeEqual } from '../../shared/security/crypto.ts';

export type CodePurpose = 'EMAIL_VERIFY' | 'PASSWORD_RESET';
type Executor = Kysely<Database> | Transaction<Database>;

const CODE_TTL_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;

/**
 * Six-digit one-time codes (email verification, password reset). Stored as keyed hashes,
 * single use, 15-minute expiry, max 5 attempts; issuing a new code invalidates older ones.
 */
@Injectable()
export class CodesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private hash(userId: string, purpose: CodePurpose, code: string): Buffer {
    return hmac(this.config.appSecret, `otp:${purpose}`, `${userId}:${code}`);
  }

  /** Creates a new code and returns it in plain text (to be emailed, never stored). */
  async issue(executor: Executor, userId: string, purpose: CodePurpose): Promise<string> {
    const code = oneTimeCode();
    const now = new Date();
    await executor
      .updateTable('verification_codes')
      .set({ consumed_at: now })
      .where('user_id', '=', userId)
      .where('purpose', '=', purpose)
      .where('consumed_at', 'is', null)
      .execute();
    await executor
      .insertInto('verification_codes')
      .values({
        user_id: userId,
        purpose,
        code_hash: this.hash(userId, purpose, code),
        expires_at: new Date(now.getTime() + CODE_TTL_MS),
      })
      .execute();
    return code;
  }

  /**
   * Verifies and consumes the latest code. `onSuccess` runs in the same transaction, so the
   * effect (e.g. marking the email verified) and the consumption commit together. Failed
   * attempts are committed too, which is why this never throws for a wrong code.
   */
  async consume(
    userId: string,
    purpose: CodePurpose,
    code: string,
    onSuccess: (trx: Transaction<Database>) => Promise<void>,
  ): Promise<boolean> {
    return this.db.transaction().execute(async (trx) => {
      const row = await trx
        .selectFrom('verification_codes')
        .select(['id', 'code_hash', 'attempts'])
        .where('user_id', '=', userId)
        .where('purpose', '=', purpose)
        .where('consumed_at', 'is', null)
        .where('expires_at', '>', new Date())
        .orderBy('created_at', 'desc')
        .limit(1)
        .forUpdate()
        .executeTakeFirst();
      if (!row) return false;

      if (!safeEqual(row.code_hash, this.hash(userId, purpose, code))) {
        const attempts = row.attempts + 1;
        await trx
          .updateTable('verification_codes')
          .set({ attempts, consumed_at: attempts >= MAX_ATTEMPTS ? new Date() : null })
          .where('id', '=', row.id)
          .execute();
        return false;
      }

      await trx
        .updateTable('verification_codes')
        .set({ consumed_at: new Date() })
        .where('id', '=', row.id)
        .execute();
      await onSuccess(trx);
      return true;
    });
  }
}
