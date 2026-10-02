import { type DynamicModule, Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Redis } from 'ioredis';

import type { AppConfig } from '../../config/config.ts';
import { BullMqEmailOutbox, EMAIL_OUTBOX } from '../email/email.ts';
import { REDIS } from '../infrastructure.module.ts';
import { AuthGuard } from './auth.guard.ts';
import { AppThrottlerGuard, RedisThrottlerStorage } from './throttling.ts';
import { TokenService } from './token.service.ts';

/**
 * Global security wiring. Guard order matters: authentication runs first so rate limits can key
 * on the user; then rate limiting (docs/SECURITY_MODEL.md §3, §5).
 */
@Global()
@Module({})
export class SecurityModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: SecurityModule,
      imports: [
        ThrottlerModule.forRootAsync({
          inject: [REDIS],
          useFactory: (redis: Redis) => ({
            throttlers: [{ name: 'default', ttl: 60_000, limit: 300 }],
            storage: new RedisThrottlerStorage(redis),
            skipIf: () => !config.rateLimitsEnabled,
          }),
        }),
      ],
      providers: [
        { provide: TokenService, useFactory: () => TokenService.create(config) },
        { provide: EMAIL_OUTBOX, useFactory: () => new BullMqEmailOutbox(config.redisUrl) },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: AppThrottlerGuard },
      ],
      exports: [TokenService, EMAIL_OUTBOX],
    };
  }
}
