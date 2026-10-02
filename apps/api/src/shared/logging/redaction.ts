/** Fields never written to logs (docs/OBSERVABILITY.md §2). */
export const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["idempotency-key"]',
  '*.password',
  '*.newPassword',
  '*.refreshToken',
  '*.accessToken',
  '*.code',
  '*.token',
];
