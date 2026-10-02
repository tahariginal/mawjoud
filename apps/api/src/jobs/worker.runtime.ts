import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { type Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

import { APP_CONFIG, type AppConfig } from '../config/config.ts';
import { EMAIL_QUEUE, type EmailMessage } from '../shared/email/email.ts';
import { EMAIL_SENDER, type EmailSender } from './email-sender.ts';
import { JOB_NAMES, type JobName, JobsService } from './jobs.service.ts';

export const MAINTENANCE_QUEUE = 'maintenance';

/** How often each scheduled job runs (docs/SYSTEM_ARCHITECTURE.md §7). */
const SCHEDULE_MS: Record<JobName, number> = {
  'orders.mark-ready': 60_000,
  'orders.mark-no-show': 5 * 60_000,
  'offers.end-expired': 60_000,
  'maintenance.cleanup': 60 * 60_000,
};

/**
 * Background processing (separate process from the API, same codebase): email delivery and
 * scheduled maintenance. Jobs are idempotent and retried with exponential backoff; final
 * failures are logged at error level for alerting (docs/OBSERVABILITY.md §4).
 */
@Injectable()
export class WorkerRuntime implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('Worker');
  private connection: Redis | undefined;
  private readonly workers: Worker[] = [];
  private maintenance: Queue | undefined;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(JobsService) private readonly jobs: JobsService,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Workers use blocking commands: BullMQ requires maxRetriesPerRequest = null.
    this.connection = new Redis(this.config.redisUrl, { maxRetriesPerRequest: null });
    const prefix = this.config.bullPrefix;

    this.maintenance = new Queue(MAINTENANCE_QUEUE, { connection: this.connection, prefix });
    for (const name of JOB_NAMES) {
      await this.maintenance.upsertJobScheduler(
        name,
        { every: SCHEDULE_MS[name] },
        {
          name,
          opts: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5_000 },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        },
      );
    }

    this.watch(
      new Worker(
        MAINTENANCE_QUEUE,
        async (job: Job) => {
          const affected = await this.jobs.run(job.name);
          if (affected > 0) this.logger.log({ job: job.name, affected }, 'Job done');
          return affected;
        },
        { connection: this.connection, prefix, concurrency: 1 },
      ),
    );
    this.watch(
      new Worker<EmailMessage>(
        EMAIL_QUEUE,
        async (job) => {
          await this.email.send(job.data);
        },
        { connection: this.connection, prefix, concurrency: 5 },
      ),
    );
    this.logger.log('Worker started');
  }

  private watch(worker: Worker): void {
    worker.on('failed', (job, err) => {
      const final = job ? job.attemptsMade >= (job.opts.attempts ?? 1) : true;
      // Job data may contain one-time codes: log identifiers only.
      const meta = {
        queue: worker.name,
        job: job?.name,
        id: job?.id,
        attempts: job?.attemptsMade,
        err,
      };
      if (final) this.logger.error(meta, 'Job failed permanently');
      else this.logger.warn(meta, 'Job failed, will retry');
    });
    worker.on('error', (err) => this.logger.error({ err, queue: worker.name }, 'Worker error'));
    this.workers.push(worker);
  }

  async onApplicationShutdown(): Promise<void> {
    // Finish in-flight jobs, then close connections (graceful shutdown).
    await Promise.allSettled(this.workers.map((w) => w.close()));
    await this.maintenance?.close();
    await this.connection?.quit().catch(() => undefined);
  }
}
