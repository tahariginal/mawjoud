import { ApiErrorEnvelope, AuthTokens, Me, NotificationPreferences } from '@mawjood/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp, type TestContext } from './support/app.ts';
import { login, PASSWORD, registerUser, uniqueEmail } from './support/users.ts';

let t: TestContext;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});

const errorCode = (body: unknown) => ApiErrorEnvelope.parse(body).error.code;

describe('registration and email verification', () => {
  it('registers, sends a code and verifies the email', async () => {
    const user = await registerUser(t, { verified: false });
    const me = Me.parse((await t.http().get('/api/v1/me').set(user.auth).expect(200)).body);
    expect(me.emailVerified).toBe(false);

    const verified = await t
      .http()
      .post('/api/v1/auth/email/verify')
      .set(user.auth)
      .send({ code: t.email.lastCode(user.email) })
      .expect(200);
    expect(Me.parse(verified.body).emailVerified).toBe(true);
  });

  it('rejects a duplicate email (case-insensitive)', async () => {
    const user = await registerUser(t);
    const res = await t
      .http()
      .post('/api/v1/auth/register')
      .send({
        email: user.email.toUpperCase(),
        password: PASSWORD,
        displayName: 'Dup',
        locale: 'en',
      })
      .expect(409);
    expect(errorCode(res.body)).toBe('AUTH_EMAIL_TAKEN');
  });

  it('rejects weak passwords and unknown fields', async () => {
    const weak = await t
      .http()
      .post('/api/v1/auth/register')
      .send({ email: uniqueEmail(), password: 'short', displayName: 'X', locale: 'en' })
      .expect(400);
    expect(errorCode(weak.body)).toBe('VALIDATION_FAILED');

    const extra = await t
      .http()
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail(),
        password: PASSWORD,
        displayName: 'X',
        locale: 'en',
        role: 'ADMIN',
      })
      .expect(400);
    expect(errorCode(extra.body)).toBe('VALIDATION_FAILED');
  });

  it('locks a code after 5 wrong attempts', async () => {
    const user = await registerUser(t, { verified: false });
    const code = t.email.lastCode(user.email);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i += 1) {
      const res = await t
        .http()
        .post('/api/v1/auth/email/verify')
        .set(user.auth)
        .send({ code: wrong })
        .expect(400);
      expect(errorCode(res.body)).toBe('AUTH_CODE_INVALID');
    }
    // Even the right code no longer works once locked.
    await t.http().post('/api/v1/auth/email/verify').set(user.auth).send({ code }).expect(400);
  });

  it('resend issues a new code and invalidates the old one', async () => {
    const user = await registerUser(t, { verified: false });
    const first = t.email.lastCode(user.email);
    await t.http().post('/api/v1/auth/email/resend').set(user.auth).expect(202);
    const second = t.email.lastCode(user.email);
    if (first !== second) {
      await t
        .http()
        .post('/api/v1/auth/email/verify')
        .set(user.auth)
        .send({ code: first })
        .expect(400);
    }
    await t
      .http()
      .post('/api/v1/auth/email/verify')
      .set(user.auth)
      .send({ code: second })
      .expect(200);
  });
});

describe('login and access control', () => {
  it('logs in with correct credentials only', async () => {
    const user = await registerUser(t);
    await login(t, user);
    const res = await t
      .http()
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'wrong-password!' })
      .expect(401);
    expect(errorCode(res.body)).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('does not reveal whether an email exists', async () => {
    const res = await t
      .http()
      .post('/api/v1/auth/login')
      .send({ email: uniqueEmail('nobody'), password: 'whatever-password' })
      .expect(401);
    expect(errorCode(res.body)).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('denies protected routes without a valid token', async () => {
    const none = await t.http().get('/api/v1/me').expect(401);
    expect(errorCode(none.body)).toBe('AUTH_REQUIRED');
    const forged = await t
      .http()
      .get('/api/v1/me')
      .set('Authorization', 'Bearer abc.def.ghi')
      .expect(401);
    expect(errorCode(forged.body)).toBe('AUTH_REQUIRED');
  });

  it('keeps public routes public', async () => {
    await t.http().get('/api/v1/categories').expect(200);
  });
});

describe('refresh token rotation (CS-17)', () => {
  it('rotates on refresh and revokes the family when an old token is reused', async () => {
    const user = await registerUser(t);
    const first = AuthTokens.parse(
      (
        await t
          .http()
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: user.refreshToken })
          .expect(200)
      ).body,
    );
    expect(first.refreshToken).not.toBe(user.refreshToken);

    // Reusing the rotated token is treated as theft…
    const reuse = await t
      .http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: user.refreshToken })
      .expect(401);
    expect(errorCode(reuse.body)).toBe('AUTH_SESSION_REVOKED');
    // …and the newest token of the family is revoked as well.
    await t
      .http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(401);
  });

  it('rejects malformed and unknown refresh tokens', async () => {
    await t.http().post('/api/v1/auth/refresh').send({ refreshToken: 'nonsense' }).expect(401);
    await t
      .http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: '00000000-0000-4000-8000-000000000000.abc' })
      .expect(401);
  });

  it('logout revokes the session', async () => {
    const user = await registerUser(t);
    await t.http().post('/api/v1/auth/logout').set(user.auth).expect(204);
    await t
      .http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: user.refreshToken })
      .expect(401);
  });
});

describe('password reset', () => {
  it('always answers 202 and resets with a valid code, signing out everywhere', async () => {
    const user = await registerUser(t);
    await t
      .http()
      .post('/api/v1/auth/password/forgot')
      .send({ email: uniqueEmail('ghost') })
      .expect(202);
    await t.http().post('/api/v1/auth/password/forgot').send({ email: user.email }).expect(202);
    const code = t.email.lastCode(user.email);

    const newPassword = 'another-strong-password';
    await t
      .http()
      .post('/api/v1/auth/password/reset')
      .send({ email: user.email, code, newPassword })
      .expect(204);

    await t
      .http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: user.refreshToken })
      .expect(401);
    await login(t, { email: user.email, password: newPassword });
    await t
      .http()
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: PASSWORD })
      .expect(401);
  });

  it('rejects a wrong code without revealing anything', async () => {
    const user = await registerUser(t);
    const res = await t
      .http()
      .post('/api/v1/auth/password/reset')
      .send({ email: user.email, code: '123456', newPassword: 'another-strong-password' })
      .expect(400);
    expect(errorCode(res.body)).toBe('AUTH_CODE_INVALID');
  });
});

describe('account', () => {
  it('updates the profile and notification preferences', async () => {
    const user = await registerUser(t);
    const me = Me.parse(
      (await t.http().patch('/api/v1/me').set(user.auth).send({ displayName: 'Salma' }).expect(200))
        .body,
    );
    expect(me.displayName).toBe('Salma');

    const prefs = NotificationPreferences.parse(
      (await t.http().get('/api/v1/me/notification-preferences').set(user.auth).expect(200)).body,
    );
    const changed = { ...prefs, maxFavoriteAlertsPerDay: 5 };
    const saved = await t
      .http()
      .put('/api/v1/me/notification-preferences')
      .set(user.auth)
      .send(changed)
      .expect(200);
    expect(NotificationPreferences.parse(saved.body).maxFavoriteAlertsPerDay).toBe(5);
  });

  it('deletes the account after re-authentication and anonymises it', async () => {
    const user = await registerUser(t);
    await t
      .http()
      .delete('/api/v1/me')
      .set(user.auth)
      .send({ password: 'not-my-password' })
      .expect(401);
    await t.http().delete('/api/v1/me').set(user.auth).send({ password: PASSWORD }).expect(204);

    await t.http().get('/api/v1/me').set(user.auth).expect(401);
    await t
      .http()
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: PASSWORD })
      .expect(401);
    const row = await t.db
      .selectFrom('users')
      .select(['email', 'status', 'password_hash'])
      .where('id', '=', user.id)
      .executeTakeFirstOrThrow();
    expect(row.status).toBe('DELETED');
    expect(row.password_hash).toBeNull();
    expect(row.email).not.toBe(user.email);
  });
});
