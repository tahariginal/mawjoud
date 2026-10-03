import type { ErrorCode } from '@mazal/contracts';

/** Server error codes plus failures that only exist on the client. */
export type ClientErrorCode =
  ErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'UNEXPECTED_RESPONSE' | 'NOT_AVAILABLE_YET';

export class ApiError extends Error {
  readonly code: ClientErrorCode;
  readonly status: number | null;
  readonly requestId: string | null;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    code: ClientErrorCode,
    message: string,
    options: {
      status?: number | null;
      requestId?: string | null;
      details?: Record<string, unknown>;
    } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = options.status ?? null;
    this.requestId = options.requestId ?? null;
    this.details = options.details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function errorCodeOf(error: unknown): ClientErrorCode {
  return isApiError(error) ? error.code : 'INTERNAL_ERROR';
}

/** Errors worth retrying automatically for idempotent reads. */
export function isTransientError(error: unknown): boolean {
  if (!isApiError(error)) return false;
  if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') return true;
  return error.status !== null && error.status >= 500;
}
