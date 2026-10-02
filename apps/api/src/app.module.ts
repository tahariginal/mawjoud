import { randomUUID } from 'node:crypto';

import { type DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import type { AppConfig } from './config/config.ts';
import { IdentityModule } from './modules/identity/identity.module.ts';
import { MerchantsModule } from './modules/merchants/merchants.module.ts';
import { PlatformController } from './modules/platform/platform.controller.ts';
import { AllExceptionsFilter } from './shared/errors/error.filter.ts';
import { createValidationPipe } from './shared/errors/validation.ts';
import { HealthController } from './shared/health/health.controller.ts';
import { InfrastructureModule } from './shared/infrastructure.module.ts';
import { SecurityModule } from './shared/security/security.module.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Fields never written to logs (docs/OBSERVABILITY.md §2). */
export const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["idempotency-key"]',
  '*.password',
  '*.newPassword',
  '*.refreshToken',
  '*.accessToken',
  '*.code',
  '*.token',
];

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        InfrastructureModule.forRoot(config),
        SecurityModule.forRoot(config),
        IdentityModule,
        MerchantsModule,
        LoggerModule.forRoot({
          pinoHttp: {
            level: config.logLevel,
            redact: { paths: LOG_REDACT_PATHS, censor: '[redacted]' },
            // Accept a client X-Request-Id if it is a UUID, otherwise generate one; echo it back.
            genReqId: (req, res) => {
              const incoming = req.headers['x-request-id'];
              const id =
                typeof incoming === 'string' && UUID.test(incoming) ? incoming : randomUUID();
              res.setHeader('X-Request-Id', id);
              return id;
            },
            serializers: {
              req: (req: { id: unknown; method: unknown; url: unknown }) => ({
                id: req.id,
                method: req.method,
                url: req.url,
              }),
              res: (res: { statusCode: unknown }) => ({ statusCode: res.statusCode }),
            },
            ...(config.appEnv === 'development'
              ? { transport: { target: 'pino-pretty', options: { singleLine: true } } }
              : {}),
          },
        }),
      ],
      controllers: [HealthController, PlatformController],
      providers: [
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        { provide: APP_PIPE, useFactory: createValidationPipe },
      ],
    };
  }
}
