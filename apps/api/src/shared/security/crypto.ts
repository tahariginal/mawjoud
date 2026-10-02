import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** Keyed hash with a purpose label, so one secret can safely serve several uses. */
export function hmac(secret: string, label: string, data: string): Buffer {
  return createHmac('sha256', secret).update(`${label}\u0000${data}`).digest();
}

export function sha256(data: string): Buffer {
  return createHash('sha256').update(data).digest();
}

/** Constant-time comparison for secrets of possibly different lengths. */
export function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Six-digit one-time code from a CSPRNG (uniform, no modulo bias). */
export function oneTimeCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Random string over a given alphabet (uniform via randomInt). */
export function randomFromAlphabet(length: number, alphabet: string): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += alphabet.charAt(randomInt(0, alphabet.length));
  return out;
}
