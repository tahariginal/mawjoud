import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';

import { DB, type Db } from '../database/db.ts';

/** Grace after the pickup window before an uncollected order becomes NO_SHOW (minutes). */
const NO_SHOW_GRACE_MINUTES = 30;
/** Bounded batches keep each statement short; the scheduler runs again soon. */
const BATCH = 1_000;

export const JOB_NAMES = [
  'orders.mark-ready',
  'orders.mark-no-show',
  'offers.end-expired',
  'maintenance.cleanup',
] as const;
export type JobName = (typeof JOB_NAMES)[number];

/** Every job is idempotent: guarded updates only touch rows still in the source state. */
@Injectable()
export class JobsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async run(name: string): Promise<number> {
    switch (name as JobName) {
      case 'orders.mark-ready':
        return this.markReady();
      case 'orders.mark-no-show':
        return this.markNoShow();
      case 'offers.end-expired':
        return this.endExpiredOffers();
      case 'maintenance.cleanup':
        return this.cleanup();
      default:
        throw new Error(`Unknown job ${name}`);
    }
  }

  /** CONFIRMED → READY_FOR_PICKUP when the window opens (with history, in one statement). */
  async markReady(): Promise<number> {
    const result = await sql`
      WITH candidates AS (
        SELECT id FROM orders
        WHERE status = 'CONFIRMED' AND pickup_start <= now()
        ORDER BY pickup_start
        LIMIT ${BATCH}
        FOR UPDATE SKIP LOCKED
      ), moved AS (
        UPDATE orders o SET status = 'READY_FOR_PICKUP'
        FROM candidates c WHERE o.id = c.id AND o.status = 'CONFIRMED'
        RETURNING o.id
      )
      INSERT INTO order_status_history (order_id, from_status, to_status, actor_type)
      SELECT id, 'CONFIRMED', 'READY_FOR_PICKUP', 'SYSTEM' FROM moved
    `.execute(this.db);
    return Number(result.numAffectedRows ?? 0);
  }

  /** Uncollected after window + grace → NO_SHOW (nothing to refund: pay at pickup, ADR-015). */
  async markNoShow(): Promise<number> {
    const result = await sql`
      WITH candidates AS (
        SELECT id, status FROM orders
        WHERE status IN ('CONFIRMED', 'READY_FOR_PICKUP')
          AND pickup_end < now() - make_interval(mins => ${NO_SHOW_GRACE_MINUTES})
        ORDER BY pickup_end
        LIMIT ${BATCH}
        FOR UPDATE SKIP LOCKED
      ), moved AS (
        UPDATE orders o SET status = 'NO_SHOW'
        FROM candidates c WHERE o.id = c.id AND o.status = c.status
        RETURNING o.id, c.status AS from_status
      )
      INSERT INTO order_status_history (order_id, from_status, to_status, actor_type)
      SELECT id, from_status, 'NO_SHOW', 'SYSTEM' FROM moved
    `.execute(this.db);
    return Number(result.numAffectedRows ?? 0);
  }

  /** Keeps the stored lifecycle tidy (display status already derives ENDED from the clock). */
  async endExpiredOffers(): Promise<number> {
    const result = await this.db
      .updateTable('offers')
      .set({ status: 'ENDED', version: sql<number>`version + 1` })
      .where('status', 'in', ['ACTIVE', 'PAUSED'])
      .where('pickup_end', '<=', new Date())
      .executeTakeFirst();
    return Number(result.numUpdatedRows);
  }

  /** Retention (docs/DATABASE_DESIGN.md §7). */
  async cleanup(): Promise<number> {
    const day = 86_400_000;
    const now = Date.now();
    const results = await Promise.all([
      this.db
        .deleteFrom('idempotency_keys')
        .where('expires_at', '<', new Date(now))
        .executeTakeFirst(),
      this.db
        .deleteFrom('verification_codes')
        .where((eb) =>
          eb.or([
            eb('expires_at', '<', new Date(now - 7 * day)),
            eb('consumed_at', '<', new Date(now - 7 * day)),
          ]),
        )
        .executeTakeFirst(),
      this.db
        .deleteFrom('sessions')
        .where((eb) =>
          eb.or([
            eb('revoked_at', '<', new Date(now - 30 * day)),
            eb('absolute_expires_at', '<', new Date(now - 30 * day)),
          ]),
        )
        .executeTakeFirst(),
      this.db
        .deleteFrom('pickup_attempts')
        .where('created_at', '<', new Date(now - 90 * day))
        .executeTakeFirst(),
    ]);
    return results.reduce((sum, r) => sum + Number(r.numDeletedRows), 0);
  }
}
