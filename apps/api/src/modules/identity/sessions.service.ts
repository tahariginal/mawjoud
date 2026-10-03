import type { AuthTokens, PlatformRole } from '@mazal/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type { Kysely, Transaction } from 'kysely';
import { randomUUID } from 'node:crypto';

import { DB, type Db } from '../../database/db.ts';
import type { Database } from '../../database/schema.ts';
import { unauthorized } from '../../shared/errors/app-error.ts';
import { randomToken, safeEqual, sha256 } from '../../shared/security/crypto.ts';
import { TokenService } from '../../shared/security/token.service.ts';

const DAY = 86_400_000;
const REFRESH_SLIDING_DAYS = 30;
const REFRESH_ABSOLUTE_DAYS = 90;

type Executor = Kysely<Database> | Transaction<Database>;

const revoked = () => unauthorized('AUTH_SESSION_REVOKED', 'Session is no longer valid');

/**
 * Refresh-token sessions (ADR-011): opaque `<sessionId>.<secret>`, stored hashed, rotated on
 * every use. Presenting an already-rotated token revokes the whole family (theft signal).
 */
@Injectable()
export class SessionsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(TokenService) private readonly tokens: TokenService,
  ) {}

  async issue(
    executor: Executor,
    user: { id: string; role: PlatformRole },
    userAgent: string | null,
    family?: { familyId: string; absoluteExpiresAt: Date },
  ): Promise<{ tokens: AuthTokens; sessionId: string }> {
    const now = Date.now();
    const sessionId = randomUUID();
    const secret = randomToken(32);
    const absoluteExpiresAt =
      family?.absoluteExpiresAt ?? new Date(now + REFRESH_ABSOLUTE_DAYS * DAY);
    const expiresAt = new Date(
      Math.min(now + REFRESH_SLIDING_DAYS * DAY, absoluteExpiresAt.getTime()),
    );

    await executor
      .insertInto('sessions')
      .values({
        id: sessionId,
        user_id: user.id,
        family_id: family?.familyId ?? randomUUID(),
        secret_hash: sha256(secret),
        expires_at: expiresAt,
        absolute_expires_at: absoluteExpiresAt,
        user_agent: userAgent?.slice(0, 300) ?? null,
      })
      .execute();

    const access = await this.tokens.signAccess({ userId: user.id, sessionId, role: user.role });
    return {
      sessionId,
      tokens: {
        accessToken: access.token,
        accessTokenExpiresAt: access.expiresAt.toISOString(),
        refreshToken: `${sessionId}.${secret}`,
      },
    };
  }

  async rotate(refreshToken: string, userAgent: string | null): Promise<AuthTokens> {
    const dot = refreshToken.indexOf('.');
    const sessionId = dot > 0 ? refreshToken.slice(0, dot) : '';
    const secret = dot > 0 ? refreshToken.slice(dot + 1) : '';
    if (!/^[0-9a-f-]{36}$/i.test(sessionId) || secret.length === 0) throw revoked();

    const outcome = await this.db.transaction().execute(async (trx) => {
      const session = await trx
        .selectFrom('sessions')
        .innerJoin('users', 'users.id', 'sessions.user_id')
        .select([
          'sessions.id',
          'sessions.user_id',
          'sessions.family_id',
          'sessions.secret_hash',
          'sessions.expires_at',
          'sessions.absolute_expires_at',
          'sessions.revoked_at',
          'users.status',
          'users.platform_role',
        ])
        .where('sessions.id', '=', sessionId)
        .forUpdate('sessions')
        .executeTakeFirst();

      if (!session || !safeEqual(session.secret_hash, sha256(secret)))
        return { kind: 'invalid' as const };

      if (session.revoked_at !== null) {
        // Reuse of a rotated token: assume theft, revoke every session of the family.
        await trx
          .updateTable('sessions')
          .set({ revoked_at: new Date() })
          .where('family_id', '=', session.family_id)
          .where('revoked_at', 'is', null)
          .execute();
        return { kind: 'reused' as const };
      }

      const now = Date.now();
      if (
        session.expires_at.getTime() <= now ||
        session.absolute_expires_at.getTime() <= now ||
        session.status !== 'ACTIVE'
      ) {
        await trx
          .updateTable('sessions')
          .set({ revoked_at: new Date() })
          .where('id', '=', session.id)
          .execute();
        return { kind: 'expired' as const };
      }

      const next = await this.issue(
        trx,
        { id: session.user_id, role: session.platform_role },
        userAgent,
        {
          familyId: session.family_id,
          absoluteExpiresAt: session.absolute_expires_at,
        },
      );
      await trx
        .updateTable('sessions')
        .set({ revoked_at: new Date(), replaced_by: next.sessionId })
        .where('id', '=', session.id)
        .execute();
      return { kind: 'ok' as const, tokens: next.tokens };
    });

    if (outcome.kind !== 'ok') throw revoked();
    return outcome.tokens;
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db
      .updateTable('sessions')
      .set({ revoked_at: new Date() })
      .where('id', '=', sessionId)
      .where('revoked_at', 'is', null)
      .execute();
  }

  async revokeAllForUser(executor: Executor, userId: string): Promise<void> {
    await executor
      .updateTable('sessions')
      .set({ revoked_at: new Date() })
      .where('user_id', '=', userId)
      .where('revoked_at', 'is', null)
      .execute();
  }
}
