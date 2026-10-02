import { Controller, Get, HttpCode, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Redis } from 'ioredis';
import { sql } from 'kysely';

import { DB, type Db, hasPendingMigrations } from '../../database/db.ts';
import { REDIS } from '../infrastructure.module.ts';
import { Public } from '../security/public.decorator.ts';

type Check = 'ok' | 'fail';

async function settle(check: () => Promise<unknown>, timeoutMs = 2_000): Promise<Check> {
  try {
    await Promise.race([
      check(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    return 'ok';
  } catch {
    return 'fail';
  }
}

/** Liveness and readiness probes (docs/OBSERVABILITY.md §6). Not under /api/v1. */
@Public()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get('live')
  @HttpCode(200)
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    const [database, redis, migrations] = await Promise.all([
      settle(() => sql`select 1`.execute(this.db)),
      settle(() => this.redis.ping()),
      settle(async () => {
        if (await hasPendingMigrations(this.db)) throw new Error('pending migrations');
      }),
    ]);
    const checks = { database, redis, migrations };
    const ok = Object.values(checks).every((c) => c === 'ok');
    res.status(ok ? 200 : 503);
    return { status: ok ? 'ok' : 'unavailable', checks };
  }
}
