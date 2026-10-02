import 'reflect-metadata';

import { randomUUID } from 'node:crypto';

import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { inject } from 'vitest';

import { loadConfig } from '../src/config/config.ts';
import { EMAIL_SENDER, type EmailSender } from '../src/jobs/email-sender.ts';
import { JobsService } from '../src/jobs/jobs.service.ts';
import { MAINTENANCE_QUEUE } from '../src/jobs/worker.runtime.ts';
import { WorkerModule } from '../src/jobs/worker.module.ts';
import { BullMqEmailOutbox, type EmailMessage } from '../src/shared/email/email.ts';
import { createTestApp, createTestDatabase, type TestContext } from './support/app.ts';
import { createMerchant, createOffer, type TestMerchant } from './support/merchants.ts';
import { createVerifiedUsers, reserveOk } from './support/orders.ts';

const HOUR = 3_600_000;

let t: TestContext;
let shop: TestMerchant;
let jobs: JobsService;

beforeAll(async () => {
  t = await createTestApp();
  shop = await createMerchant(t);
  jobs = new JobsService(t.db);
});
afterAll(async () => {
  await t.close();
});

const statusOf = async (orderId: string) =>
  (
    await t.db
      .selectFrom('orders')
      .select('status')
      .where('id', '=', orderId)
      .executeTakeFirstOrThrow()
  ).status;

describe('scheduled jobs (idempotent)', () => {
  it('marks confirmed orders ready when the window opens', async () => {
    const offer = await createOffer(t, shop);
    const [buyer] = await createVerifiedUsers(t, 1);
    const order = await reserveOk(t, buyer!, offer.id);
    expect(order.status).toBe('CONFIRMED');
    await t.db
      .updateTable('orders')
      .set({ pickup_start: new Date(Date.now() - 60_000) })
      .where('id', '=', order.id)
      .execute();

    expect(await jobs.markReady()).toBeGreaterThanOrEqual(1);
    expect(await statusOf(order.id)).toBe('READY_FOR_PICKUP');
    // Running again changes nothing.
    await jobs.markReady();
    const history = await t.db
      .selectFrom('order_status_history')
      .select('to_status')
      .where('order_id', '=', order.id)
      .execute();
    expect(history.filter((h) => h.to_status === 'READY_FOR_PICKUP')).toHaveLength(1);
  });

  it('marks uncollected orders as no-show after the grace period', async () => {
    const offer = await createOffer(t, shop);
    const [buyer] = await createVerifiedUsers(t, 1);
    const order = await reserveOk(t, buyer!, offer.id);
    await t.db
      .updateTable('orders')
      .set({
        pickup_start: new Date(Date.now() - 3 * HOUR),
        pickup_end: new Date(Date.now() - 2 * HOUR),
      })
      .where('id', '=', order.id)
      .execute();
    expect(await jobs.markNoShow()).toBeGreaterThanOrEqual(1);
    expect(await statusOf(order.id)).toBe('NO_SHOW');
  });

  it('ends offers whose window has passed', async () => {
    const offer = await createOffer(t, shop);
    await sql`update offers set pickup_start = now() - interval '3 hours', pickup_end = now() - interval '1 hour' where id = ${offer.id}`.execute(
      t.db,
    );
    expect(await jobs.endExpiredOffers()).toBeGreaterThanOrEqual(1);
    const row = await t.db
      .selectFrom('offers')
      .select('status')
      .where('id', '=', offer.id)
      .executeTakeFirstOrThrow();
    expect(row.status).toBe('ENDED');
  });

  it('deletes expired idempotency keys', async () => {
    const [user] = await createVerifiedUsers(t, 1);
    await t.db
      .insertInto('idempotency_keys')
      .values({
        user_id: user!.id,
        endpoint: 'test',
        key: randomUUID(),
        request_hash: Buffer.from('x'),
        status: 'COMPLETED',
        locked_until: new Date(),
        expires_at: new Date(Date.now() - 1_000),
      })
      .execute();
    await jobs.cleanup();
    const left = await t.db
      .selectFrom('idempotency_keys')
      .select('key')
      .where('user_id', '=', user!.id)
      .execute();
    expect(left).toEqual([]);
  });

  it('rejects unknown job names', async () => {
    await expect(jobs.run('nope')).rejects.toThrow(/Unknown job/);
  });
});

describe('worker process (real BullMQ + Redis)', () => {
  it('registers schedulers and delivers queued email', async () => {
    const bullPrefix = `test-bull-${randomUUID()}`;
    const redisUrl = inject('redisUrl');
    const config = {
      ...loadConfig({
        APP_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: await createTestDatabase(),
        REDIS_URL: redisUrl,
      }),
      bullPrefix,
    };
    const delivered: EmailMessage[] = [];
    const sender: EmailSender = { send: async (m) => void delivered.push(m) };

    const moduleRef = await Test.createTestingModule({ imports: [WorkerModule.forRoot(config)] })
      .overrideProvider(EMAIL_SENDER)
      .useValue(sender)
      .compile();
    // The testing module is an application context: init() runs the worker's bootstrap hooks.
    const worker = moduleRef;
    await worker.init();

    const outbox = new BullMqEmailOutbox(redisUrl, bullPrefix);
    try {
      // The producer fails fast while disconnected; wait until it is ready.
      await new Promise((resolve) => setTimeout(resolve, 300));
      await outbox.enqueue({ to: 'someone@example.test', subject: 'Hello', text: 'Code 123456' });
      const deadline = Date.now() + 10_000;
      while (delivered.length === 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      expect(delivered).toEqual([
        { to: 'someone@example.test', subject: 'Hello', text: 'Code 123456' },
      ]);

      const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
      const queue = new Queue(MAINTENANCE_QUEUE, { connection, prefix: bullPrefix });
      const schedulers = await queue.getJobSchedulers();
      expect(schedulers.map((s) => s.key).sort()).toEqual(
        [
          'maintenance.cleanup',
          'offers.end-expired',
          'orders.mark-no-show',
          'orders.mark-ready',
        ].sort(),
      );
      await queue.close();
      await connection.quit();
    } finally {
      await outbox.onApplicationShutdown();
      await worker.close();
    }
  });
});
