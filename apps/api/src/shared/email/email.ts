import { Logger, type OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

/** Port for outgoing email. The API enqueues; the worker process delivers (SMTP). */
export interface EmailOutbox {
  enqueue(message: EmailMessage): Promise<void>;
}

export const EMAIL_OUTBOX = Symbol('EMAIL_OUTBOX');
export const EMAIL_QUEUE = 'email';

/**
 * BullMQ-backed outbox. Jobs carry one-time codes, so they are removed as soon as they are
 * delivered and failed jobs expire after an hour.
 */
export class BullMqEmailOutbox implements EmailOutbox, OnApplicationShutdown {
  private readonly logger = new Logger('EmailOutbox');
  private readonly connection: Redis;
  private readonly queue: Queue<EmailMessage>;

  constructor(redisUrl: string, prefix: string) {
    // Fail fast when Redis is down instead of hanging the request (offline queue disabled).
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
    this.connection.on('error', (err) => this.logger.warn({ err }, 'Redis connection error'));
    this.queue = new Queue<EmailMessage>(EMAIL_QUEUE, {
      connection: this.connection,
      prefix,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: true,
        removeOnFail: { age: 3_600 },
      },
    });
  }

  async enqueue(message: EmailMessage): Promise<void> {
    await this.queue.add('send', message);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.queue.close();
    await this.connection.quit().catch(() => undefined);
  }
}

/** Plain-text templates (English; localisation follows with i18n of the API). */
export const emailTemplates = {
  verifyEmail: (to: string, code: string): EmailMessage => ({
    to,
    subject: 'Your Mazal verification code',
    text: `Your verification code is ${code}.\n\nIt expires in 15 minutes. If you did not create a Mazal account, you can ignore this email.`,
  }),
  passwordReset: (to: string, code: string): EmailMessage => ({
    to,
    subject: 'Reset your Mazal password',
    text: `Your password reset code is ${code}.\n\nIt expires in 15 minutes. If you did not ask to reset your password, you can ignore this email; your password stays the same.`,
  }),
};
