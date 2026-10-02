import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { unauthorized } from '../errors/app-error.ts';
import type { AuthedRequest } from './current-user.ts';
import { IS_OPTIONAL_AUTH, IS_PUBLIC } from './public.decorator.ts';
import { TokenExpiredError, TokenService } from './token.service.ts';

/**
 * Global authentication guard: deny by default (docs/SECURITY_MODEL.md §3).
 * - @Public(): no token needed.
 * - @OptionalAuth(): a token is used if present; an invalid one still fails so the client refreshes.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TokenService) private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets) === true;
    const isOptional =
      this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_AUTH, targets) === true;
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;

    if (isPublic && !isOptional) return true;
    if (!header) {
      if (isOptional) return true;
      throw unauthorized();
    }

    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match?.[1]) throw unauthorized();

    try {
      const claims = await this.tokens.verifyAccess(match[1]);
      req.user = { id: claims.userId, sessionId: claims.sessionId, role: claims.role };
      return true;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw unauthorized('AUTH_TOKEN_EXPIRED', 'Access token expired');
      }
      throw unauthorized();
    }
  }
}
