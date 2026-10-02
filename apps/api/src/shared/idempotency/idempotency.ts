import { createParamDecorator, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Transaction } from 'kysely';

import { DB, type Db } from '../../database/db.ts';
import { isRetryableTransactionError, isUniqueViolation } from '../../database/errors.ts';
import type { Database } from '../../database/schema.ts';
import { AppError, conflict } from '../errors/app-error.ts';
import type { AuthedRequest } from '../security/current-user.ts';
import { safeEqual, sha256 } from '../security/crypto.ts';

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;
const TTL_MS = 24 * 3_600_000;
const MAX_ATTEMPTS = 3;

/** Reads and validates the `Idempotency-Key` header (required). */
export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const value = ctx.switchToHttp().getRequest<AuthedRequest>().headers['idempotency-key'];
    if (typeof value !== 'string' || !KEY_PATTERN.test(value)) {
      throw new AppError('VALIDATION_FAILED', 400, 'A valid Idempotency-Key header is required', {
        fields: [{ path: 'Idempotency-Key' }],
      });
    }
    return value;
  },
);

/**
 * Exactly-once execution of a write (ADR-005). The key is claimed in the same transaction as the
 * work, so a concurrent duplicate waits on the key's row lock and then replays the stored result;
 * a failed attempt rolls back and leaves the key free for a retry. Since reservations have no
 * external call (ADR-015), one transaction covers the whole operation.
 */
@Injectable()
export class IdempotencyService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async execute<T>(
    userId: string,
    endpoint: string,
    key: string,
    request: unknown,
    work: (trx: Transaction<Database>) => Promise<T>,
    retryable: (error: unknown) => boolean = () => false,
  ): Promise<T> {
    const requestHash = sha256(JSON.stringify(request ?? null));
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.db.transaction().execute(async (trx) => {
          const now = Date.now();
          await trx
            .insertInto('idempotency_keys')
            .values({
              user_id: userId,
              endpoint,
              key,
              request_hash: requestHash,
              status: 'IN_PROGRESS',
              locked_until: new Date(now + 60_000),
              expires_at: new Date(now + TTL_MS),
            })
            .execute();
          const body = await work(trx);
          await trx
            .updateTable('idempotency_keys')
            .set({ status: 'COMPLETED', response_status: 200, response_body: JSON.stringify(body) })
            .where('user_id', '=', userId)
            .where('endpoint', '=', endpoint)
            .where('key', '=', key)
            .execute();
          return body;
        });
      } catch (error) {
        if (isUniqueViolation(error, 'idempotency_keys_pkey'))
          return this.replay<T>(userId, endpoint, key, requestHash);
        const transient = isRetryableTransactionError(error) || retryable(error);
        if (transient && attempt < MAX_ATTEMPTS) continue;
        throw error;
      }
    }
  }

  private async replay<T>(
    userId: string,
    endpoint: string,
    key: string,
    requestHash: Buffer,
  ): Promise<T> {
    const row = await this.db
      .selectFrom('idempotency_keys')
      .select(['request_hash', 'status', 'response_body'])
      .where('user_id', '=', userId)
      .where('endpoint', '=', endpoint)
      .where('key', '=', key)
      .executeTakeFirst();
    if (!row) throw conflict('IDEMPOTENCY_IN_PROGRESS', 'Request is being processed');
    if (!safeEqual(row.request_hash, requestHash)) {
      throw conflict('IDEMPOTENCY_KEY_REUSED', 'Idempotency key was used with a different request');
    }
    if (row.status !== 'COMPLETED')
      throw conflict('IDEMPOTENCY_IN_PROGRESS', 'Request is being processed');
    return row.response_body as T;
  }
}
