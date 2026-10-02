import { StandardSchemaValidationPipe } from '@nestjs/common';

import { AppError } from './app-error.ts';

/**
 * Global validation: every `@Body({ schema })`, `@Query({ schema })` and `@Param(name, { schema })`
 * is validated with the shared Zod contracts (Standard Schema). Failures become VALIDATION_FAILED
 * with field paths only — validator messages are not echoed back.
 */
export function createValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    transform: true,
    exceptionFactory: (issues) =>
      new AppError('VALIDATION_FAILED', 400, 'The request is invalid.', {
        fields: issues.map((issue) => ({
          path: (issue.path ?? [])
            .map((segment) => (typeof segment === 'object' ? String(segment.key) : String(segment)))
            .join('.'),
        })),
      }),
  });
}
