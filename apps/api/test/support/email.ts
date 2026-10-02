import type { EmailMessage, EmailOutbox } from '../../src/shared/email/email.ts';

/** Captures outgoing email in tests (the real outbox is BullMQ → worker → SMTP). */
export class CapturingEmailOutbox implements EmailOutbox {
  readonly messages: EmailMessage[] = [];

  async enqueue(message: EmailMessage): Promise<void> {
    this.messages.push(message);
  }

  /** Latest 6-digit code sent to an address. */
  lastCode(to: string): string {
    const message = [...this.messages]
      .reverse()
      .find((m) => m.to.toLowerCase() === to.toLowerCase());
    const code = message?.text.match(/\b(\d{6})\b/)?.[1];
    if (!code) throw new Error(`No code sent to ${to}`);
    return code;
  }
}
