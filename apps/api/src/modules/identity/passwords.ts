import argon2 from 'argon2';

/** argon2id with the library's defaults (64 MiB, t=3, p=4) — above the OWASP minimums. */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

let dummyHash: Promise<string> | undefined;

/**
 * Verifies a password. When the account does not exist, a dummy hash is checked so response
 * time does not reveal whether an email is registered.
 */
export async function verifyPassword(hash: string | null, password: string): Promise<boolean> {
  if (!hash) {
    dummyHash ??= hashPassword('dummy-password-for-timing-equalisation');
    await argon2.verify(await dummyHash, password).catch(() => false);
    return false;
  }
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
