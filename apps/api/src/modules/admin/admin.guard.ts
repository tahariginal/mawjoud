import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';

import { DB, type Db } from '../../database/db.ts';
import { forbidden, unauthorized } from '../../shared/errors/app-error.ts';
import type { AuthedRequest } from '../../shared/security/current-user.ts';

/**
 * Admin routes re-check the platform role in the database on every request, so a demotion takes
 * effect immediately instead of when the access token expires.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(DB) private readonly db: Db) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user) throw unauthorized();
    const row = await this.db
      .selectFrom('users')
      .select(['platform_role', 'status'])
      .where('id', '=', req.user.id)
      .executeTakeFirst();
    if (!row || row.status !== 'ACTIVE') throw unauthorized('AUTH_SESSION_REVOKED');
    if (row.platform_role !== 'ADMIN' && row.platform_role !== 'SUPER_ADMIN') throw forbidden();
    return true;
  }
}
