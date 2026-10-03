import type { PlatformRole } from '@mazal/contracts';
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { unauthorized } from '../errors/app-error.ts';

export type AuthUser = { id: string; sessionId: string; role: PlatformRole };

export type AuthedRequest = Request & { user?: AuthUser; id?: unknown };

/** The authenticated user. Only use on routes that are not @Public(). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user) throw unauthorized();
    return req.user;
  },
);

/** The authenticated user if a valid token was sent, otherwise null (@OptionalAuth routes). */
export const OptionalUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | null =>
    ctx.switchToHttp().getRequest<AuthedRequest>().user ?? null,
);

/** Request id assigned by the logger middleware (for audit records). */
export const RequestId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const id = ctx.switchToHttp().getRequest<AuthedRequest>().id;
  return typeof id === 'string' ? id : '';
});
