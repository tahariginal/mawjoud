import { z } from 'zod';

/**
 * Stable, machine-readable error codes. Clients map codes to translated copy.
 * Adding a code is backward compatible; removing or renaming one is a breaking change.
 * Catalog and HTTP mapping: docs/ERROR_HANDLING.md
 */
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'INVALID_CURSOR',
  'AUTH_REQUIRED',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_SESSION_REVOKED',
  'AUTH_EMAIL_NOT_VERIFIED',
  'AUTH_EMAIL_TAKEN',
  'AUTH_CODE_INVALID',
  'FORBIDDEN',
  'BUSINESS_NOT_ACTIVE',
  'NOT_FOUND',
  'OFFER_NOT_FOUND',
  'ORDER_NOT_FOUND',
  'CONFLICT_STALE_VERSION',
  'IDEMPOTENCY_KEY_REUSED',
  'IDEMPOTENCY_IN_PROGRESS',
  'OFFER_SOLD_OUT',
  'OFFER_NOT_AVAILABLE',
  'OFFER_QUANTITY_LIMIT',
  'PRICE_CHANGED',
  'ORDER_INVALID_TRANSITION',
  'INVALID_STATE_TRANSITION',
  'ORDER_CANCELLATION_CLOSED',
  'ORDER_LIMIT_REACHED',
  'PAYMENT_HOLD_EXPIRED',
  'PAYMENT_FAILED',
  'PAYMENT_PROVIDER_UNAVAILABLE',
  'PICKUP_CODE_INVALID',
  'PICKUP_ALREADY_COMPLETED',
  'PICKUP_NOT_YET_OPEN',
  'PICKUP_WINDOW_CLOSED',
  'PICKUP_ORDER_CANCELLED',
  'RATE_LIMITED',
  'APP_VERSION_UNSUPPORTED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
] as const;

export const ErrorCode = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ApiErrorEnvelope = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    requestId: z.string(),
    timestamp: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelope>;
