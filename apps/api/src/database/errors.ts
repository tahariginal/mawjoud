/** PostgreSQL error helpers (https://www.postgresql.org/docs/current/errcodes-appendix.html). */
type PgError = { code?: unknown; constraint?: unknown };

function asPgError(error: unknown): PgError | null {
  return typeof error === 'object' && error !== null ? (error as PgError) : null;
}

/** 23505 unique_violation, optionally for a specific constraint or index name. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const e = asPgError(error);
  return e?.code === '23505' && (constraint === undefined || e.constraint === constraint);
}

/** 23514 check_violation, optionally for a specific constraint. */
export function isCheckViolation(error: unknown, constraint?: string): boolean {
  const e = asPgError(error);
  return e?.code === '23514' && (constraint === undefined || e.constraint === constraint);
}

/** 40001 serialization_failure / 40P01 deadlock_detected: safe to retry the whole transaction. */
export function isRetryableTransactionError(error: unknown): boolean {
  const e = asPgError(error);
  return e?.code === '40001' || e?.code === '40P01';
}
