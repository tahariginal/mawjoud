import { randomUUID } from 'node:crypto';

import { AuthResponse, Me } from '@mawjood/contracts';
import { expect } from 'vitest';

import type { TestContext } from './app.ts';

export type TestUser = {
  id: string;
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  auth: { Authorization: string };
};

export const PASSWORD = 'correct-horse-battery';

export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}.${randomUUID().slice(0, 8)}@example.test`;
}

/** Registers a user through the public API (optionally verifying the email with the sent code). */
export async function registerUser(
  t: TestContext,
  options: { verified?: boolean; email?: string; displayName?: string } = {},
): Promise<TestUser> {
  const email = options.email ?? uniqueEmail();
  const res = await t
    .http()
    .post('/api/v1/auth/register')
    .send({
      email,
      password: PASSWORD,
      displayName: options.displayName ?? 'Test User',
      locale: 'en',
    })
    .expect(201);
  const body = AuthResponse.parse(res.body);
  const auth = { Authorization: `Bearer ${body.tokens.accessToken}` };

  if (options.verified ?? true) {
    const me = await t
      .http()
      .post('/api/v1/auth/email/verify')
      .set(auth)
      .send({ code: t.email.lastCode(email) })
      .expect(200);
    expect(Me.parse(me.body).emailVerified).toBe(true);
  }

  return {
    id: body.me.id,
    email,
    password: PASSWORD,
    accessToken: body.tokens.accessToken,
    refreshToken: body.tokens.refreshToken,
    auth,
  };
}

/** Promotes a user to a platform role directly in the database (no API exists for that). */
export async function setPlatformRole(
  t: TestContext,
  userId: string,
  role: 'ADMIN' | 'SUPER_ADMIN',
) {
  await t.db.updateTable('users').set({ platform_role: role }).where('id', '=', userId).execute();
}

/** Signs in again to obtain a token carrying fresh claims (e.g. after a role change). */
export async function login(
  t: TestContext,
  user: Pick<TestUser, 'email' | 'password'>,
): Promise<TestUser> {
  const res = await t
    .http()
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200);
  const body = AuthResponse.parse(res.body);
  return {
    id: body.me.id,
    email: user.email,
    password: user.password,
    accessToken: body.tokens.accessToken,
    refreshToken: body.tokens.refreshToken,
    auth: { Authorization: `Bearer ${body.tokens.accessToken}` },
  };
}
