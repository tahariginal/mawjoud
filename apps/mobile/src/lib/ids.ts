import * as Crypto from 'expo-crypto';

/** RFC 4122 v4 UUID from the platform's secure random source. Used for idempotency and request ids. */
export function newUuid(): string {
  return Crypto.randomUUID();
}

/** Random string drawn from `alphabet` using secure random bytes. */
export function randomFromAlphabet(length: number, alphabet: string): string {
  const bytes = Crypto.getRandomBytes(length);
  let out = '';
  for (const byte of bytes) out += alphabet.charAt(byte % alphabet.length);
  return out;
}
