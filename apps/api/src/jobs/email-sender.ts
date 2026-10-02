import { Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

import type { AppConfig } from '../config/config.ts';
import type { EmailMessage } from '../shared/email/email.ts';

/** Delivery port used by the worker. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

class SmtpEmailSender implements EmailSender {
  private readonly transport: ReturnType<typeof nodemailer.createTransport>;

  constructor(
    smtpUrl: string,
    private readonly from: string,
  ) {
    this.transport = nodemailer.createTransport(smtpUrl);
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}

/**
 * DEVELOPMENT ONLY: prints emails to the worker log when no SMTP server is configured.
 * Refused outside development (loadConfig also requires SMTP_URL in staging/production).
 */
class DevLogEmailSender implements EmailSender {
  private readonly logger = new Logger('DevEmail');

  async send(message: EmailMessage): Promise<void> {
    this.logger.warn(
      `[DEV EMAIL — not sent] to=${message.to} subject="${message.subject}"\n${message.text}`,
    );
  }
}

export function createEmailSender(config: AppConfig): EmailSender {
  if (config.smtpUrl) return new SmtpEmailSender(config.smtpUrl, config.emailFrom);
  if (config.appEnv === 'development' || config.appEnv === 'test') return new DevLogEmailSender();
  throw new Error('SMTP_URL is required to send email outside development');
}
