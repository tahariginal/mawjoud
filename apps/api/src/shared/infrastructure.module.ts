import {
  type DynamicModule,
  Global,
  Inject,
  Injectable,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { Redis } from 'ioredis';

import { APP_CONFIG, type AppConfig } from '../config/config.ts';
import { createDb, DB, type Db } from '../database/db.ts';

/** Injection token for the shared ioredis client (cache, rate limits). */
export const REDIS = Symbol('REDIS');

/** Closes pools on shutdown so SIGTERM drains cleanly (docs/ERROR_HANDLING.md §4). */
@Injectable()
class ConnectionsLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled([this.db.destroy(), this.redis.quit()]);
  }
}

/** Global infrastructure: validated config, PostgreSQL (Kysely) and Redis. */
@Global()
@Module({})
export class InfrastructureModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: InfrastructureModule,
      providers: [
        { provide: APP_CONFIG, useValue: config },
        {
          provide: DB,
          useFactory: () => createDb(config.databaseUrl, { poolMax: config.databasePoolMax }),
        },
        {
          provide: REDIS,
          useFactory: () =>
            new Redis(config.redisUrl, {
              keyPrefix: config.redisKeyPrefix,
              connectTimeout: 2_000,
              maxRetriesPerRequest: 1,
              lazyConnect: false,
            }),
        },
        ConnectionsLifecycle,
      ],
      exports: [APP_CONFIG, DB, REDIS],
    };
  }
}
