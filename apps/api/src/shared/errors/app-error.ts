import type { ErrorCode } from '@mazal/contracts';

/**
 * The only error type domain and application code should throw for expected failures.
 * Mapped to the public error envelope by AllExceptionsFilter (docs/ERROR_HANDLING.md).
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const notFound = (code: ErrorCode = 'NOT_FOUND', message = 'Resource not found') =>
  new AppError(code, 404, message);

export const conflict = (code: ErrorCode, message: string, details?: Record<string, unknown>) =>
  new AppError(code, 409, message, details);

export const forbidden = (message = 'Forbidden') => new AppError('FORBIDDEN', 403, message);

export const unauthorized = (
  code: ErrorCode = 'AUTH_REQUIRED',
  message = 'Authentication required',
) => new AppError(code, 401, message);

export const badRequest = (code: ErrorCode, message: string, details?: Record<string, unknown>) =>
  new AppError(code, 400, message, details);
