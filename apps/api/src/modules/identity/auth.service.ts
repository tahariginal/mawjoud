import type {
  AuthResponse,
  AuthTokens,
  ForgotPasswordRequest,
  LoginRequest,
  Me,
  RegisterRequest,
  ResetPasswordRequest,
} from '@mazal/contracts';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { DB, type Db } from '../../database/db.ts';
import { isUniqueViolation } from '../../database/errors.ts';
import { AppError, conflict } from '../../shared/errors/app-error.ts';
import {
  EMAIL_OUTBOX,
  type EmailMessage,
  type EmailOutbox,
  emailTemplates,
} from '../../shared/email/email.ts';
import type { AuthUser } from '../../shared/security/current-user.ts';
import { AccountService } from './account.service.ts';
import { CodesService } from './codes.service.ts';
import { hashPassword, verifyPassword } from './passwords.ts';
import { SessionsService } from './sessions.service.ts';

const invalidCredentials = () =>
  new AppError('AUTH_INVALID_CREDENTIALS', 401, 'Email or password is incorrect');
const invalidCode = () => new AppError('AUTH_CODE_INVALID', 400, 'Code is invalid or expired');

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(CodesService) private readonly codes: CodesService,
    @Inject(AccountService) private readonly accounts: AccountService,
    @Inject(EMAIL_OUTBOX) private readonly email: EmailOutbox,
  ) {}

  /** Email failures never fail the request: the user can ask for a new code. */
  private async sendEmail(message: EmailMessage): Promise<void> {
    try {
      await this.email.enqueue(message);
    } catch (err) {
      this.logger.error({ err }, 'Could not enqueue email');
    }
  }

  async register(input: RegisterRequest, userAgent: string | null): Promise<AuthResponse> {
    const passwordHash = await hashPassword(input.password);
    let result: { me: Me; tokens: AuthTokens; code: string };
    try {
      result = await this.db.transaction().execute(async (trx) => {
        const user = await trx
          .insertInto('users')
          .values({
            email: input.email,
            password_hash: passwordHash,
            display_name: input.displayName,
            locale: input.locale,
          })
          .returning(['id', 'platform_role'])
          .executeTakeFirstOrThrow();
        const code = await this.codes.issue(trx, user.id, 'EMAIL_VERIFY');
        const { tokens } = await this.sessions.issue(
          trx,
          { id: user.id, role: user.platform_role },
          userAgent,
        );
        const me = await this.accounts.getMe(user.id, trx);
        return { me, tokens, code };
      });
    } catch (error) {
      if (isUniqueViolation(error, 'users_email_key')) {
        throw conflict('AUTH_EMAIL_TAKEN', 'An account with this email already exists');
      }
      throw error;
    }
    await this.sendEmail(emailTemplates.verifyEmail(result.me.email, result.code));
    return { me: result.me, tokens: result.tokens };
  }

  async login(input: LoginRequest, userAgent: string | null): Promise<AuthResponse> {
    const user = await this.db
      .selectFrom('users')
      .select(['id', 'password_hash', 'platform_role', 'status'])
      .where('email', '=', input.email)
      .where('status', '<>', 'DELETED')
      .executeTakeFirst();
    const ok = await verifyPassword(user?.password_hash ?? null, input.password);
    if (!user || !ok) throw invalidCredentials();
    if (user.status !== 'ACTIVE') throw new AppError('FORBIDDEN', 403, 'Account is suspended');

    const { tokens } = await this.sessions.issue(
      this.db,
      { id: user.id, role: user.platform_role },
      userAgent,
    );
    return { me: await this.accounts.getMe(user.id), tokens };
  }

  refresh(refreshToken: string, userAgent: string | null): Promise<AuthTokens> {
    return this.sessions.rotate(refreshToken, userAgent);
  }

  logout(user: AuthUser): Promise<void> {
    return this.sessions.revoke(user.sessionId);
  }

  async verifyEmail(user: AuthUser, code: string): Promise<Me> {
    const ok = await this.codes.consume(user.id, 'EMAIL_VERIFY', code, async (trx) => {
      await trx
        .updateTable('users')
        .set({ email_verified_at: new Date() })
        .where('id', '=', user.id)
        .execute();
    });
    if (!ok) throw invalidCode();
    return this.accounts.getMe(user.id);
  }

  async resendVerification(user: AuthUser): Promise<void> {
    const me = await this.accounts.getMe(user.id);
    if (me.emailVerified) return;
    const code = await this.codes.issue(this.db, user.id, 'EMAIL_VERIFY');
    await this.sendEmail(emailTemplates.verifyEmail(me.email, code));
  }

  /** Always succeeds from the caller's point of view (no account enumeration). */
  async forgotPassword(input: ForgotPasswordRequest): Promise<void> {
    const user = await this.db
      .selectFrom('users')
      .select(['id', 'email'])
      .where('email', '=', input.email)
      .where('status', '=', 'ACTIVE')
      .executeTakeFirst();
    if (!user) return;
    const code = await this.codes.issue(this.db, user.id, 'PASSWORD_RESET');
    await this.sendEmail(emailTemplates.passwordReset(user.email, code));
  }

  async resetPassword(input: ResetPasswordRequest): Promise<void> {
    const user = await this.db
      .selectFrom('users')
      .select('id')
      .where('email', '=', input.email)
      .where('status', '=', 'ACTIVE')
      .executeTakeFirst();
    if (!user) throw invalidCode();
    const passwordHash = await hashPassword(input.newPassword);
    const ok = await this.codes.consume(user.id, 'PASSWORD_RESET', input.code, async (trx) => {
      await trx
        .updateTable('users')
        .set({ password_hash: passwordHash })
        .where('id', '=', user.id)
        .execute();
      // A password reset signs the account out everywhere.
      await this.sessions.revokeAllForUser(trx, user.id);
    });
    if (!ok) throw invalidCode();
  }
}
