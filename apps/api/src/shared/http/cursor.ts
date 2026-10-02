import { badRequest } from '../errors/app-error.ts';
import { hmac, safeEqual } from '../security/crypto.ts';

type CursorPayload = {
  /** Sort key of the last row returned (same order as the ORDER BY). */
  k: (string | number)[];
  /** Hash of the query the cursor belongs to. */
  h: string;
};

const invalidCursor = () => badRequest('INVALID_CURSOR', 'Cursor is invalid');

/**
 * Opaque keyset-pagination cursors (ADR-004): base64url JSON + HMAC signature, bound to the
 * query parameters, so they cannot be forged or replayed with different filters.
 */
export class CursorCodec {
  constructor(private readonly secret: string) {}

  queryHash(query: unknown): string {
    return hmac(this.secret, 'cursor-query', JSON.stringify(query))
      .toString('base64url')
      .slice(0, 16);
  }

  encode(key: (string | number)[], queryHash: string): string {
    const payload = Buffer.from(
      JSON.stringify({ k: key, h: queryHash } satisfies CursorPayload),
    ).toString('base64url');
    const signature = hmac(this.secret, 'cursor', payload).toString('base64url');
    return `${payload}.${signature}`;
  }

  decode(cursor: string, queryHash: string): (string | number)[] {
    const [payload, signature, extra] = cursor.split('.');
    if (!payload || !signature || extra !== undefined) throw invalidCursor();
    const expected = hmac(this.secret, 'cursor', payload);
    if (!safeEqual(Buffer.from(signature, 'base64url'), expected)) throw invalidCursor();
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      throw invalidCursor();
    }
    const p = parsed as Partial<CursorPayload>;
    if (!Array.isArray(p.k) || p.h !== queryHash) throw invalidCursor();
    if (!p.k.every((v) => typeof v === 'string' || typeof v === 'number')) throw invalidCursor();
    return p.k;
  }
}
