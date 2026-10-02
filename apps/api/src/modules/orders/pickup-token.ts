import { hmac, safeEqual } from '../../shared/security/crypto.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * QR pickup token `<orderId>.<mac>` (ADR-012). The MAC is derived from the server secret, so the
 * token is never stored: a database leak does not reveal valid passes.
 */
export function pickupToken(secret: string, orderId: string): string {
  return `${orderId}.${hmac(secret, 'pickup-token', orderId).toString('base64url')}`;
}

/** Returns the order id if the token is authentic, otherwise null. */
export function verifyPickupToken(secret: string, token: string): string | null {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const orderId = token.slice(0, dot);
  if (!UUID.test(orderId)) return null;
  const expected = hmac(secret, 'pickup-token', orderId);
  const given = Buffer.from(token.slice(dot + 1), 'base64url');
  return safeEqual(given, expected) ? orderId : null;
}
