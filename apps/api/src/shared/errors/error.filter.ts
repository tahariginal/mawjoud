import type { ErrorCode } from '@mazal/contracts';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AppError } from './app-error.ts';

type ErrorShape = {
  status: number;
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

/** Safe, generic messages. Raw exception messages are never sent to clients. */
const GENERIC: Partial<Record<ErrorCode, string>> = {
  VALIDATION_FAILED: 'The request is invalid.',
  AUTH_REQUIRED: 'Authentication required.',
  FORBIDDEN: 'You do not have access to this resource.',
  NOT_FOUND: 'Resource not found.',
  RATE_LIMITED: 'Too many requests. Please retry later.',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable.',
  INTERNAL_ERROR: 'An unexpected error occurred.',
};

function fromHttpStatus(status: number): ErrorCode {
  if (status === 401) return 'AUTH_REQUIRED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404 || status === 405) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 503) return 'SERVICE_UNAVAILABLE';
  if (status >= 400 && status < 500) return 'VALIDATION_FAILED';
  return 'INTERNAL_ERROR';
}

export function toErrorShape(exception: unknown): ErrorShape {
  if (exception instanceof AppError) {
    return {
      status: exception.status,
      code: exception.code,
      message: exception.message,
      ...(exception.details ? { details: exception.details } : {}),
    };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const code = fromHttpStatus(status);
    // Normalise 4xx/5xx framework errors to our codes (e.g. 405/413 become 404/400).
    const normalisedStatus = status === 405 ? 404 : status;
    return { status: normalisedStatus, code, message: GENERIC[code] ?? GENERIC.INTERNAL_ERROR! };
  }
  return { status: 500, code: 'INTERNAL_ERROR', message: GENERIC.INTERNAL_ERROR! };
}

/** Builds the public error envelope for every failed request. Logs 5xx with the full exception. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request & { id?: unknown }>();
    const res = http.getResponse<Response>();
    const shape = toErrorShape(exception);
    const requestId = typeof req.id === 'string' ? req.id : '';

    if (shape.status >= 500) {
      this.logger.error({ err: exception, requestId, path: req.path }, 'Unhandled error');
    }

    res.status(shape.status).json({
      error: {
        code: shape.code,
        message: shape.message,
        requestId,
        timestamp: new Date().toISOString(),
        ...(shape.details ? { details: shape.details } : {}),
      },
    });
  }
}
