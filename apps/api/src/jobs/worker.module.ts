import { type DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import type { AppConfig } from '../config/config.ts';
import { InfrastructureModule } from '../shared/infrastructure.module.ts';
import { LOG_REDACT_PATHS } from '../shared/logging/redaction.ts';
import { createEmailSender, EMAIL_SENDER } from './email-sender.ts';
import { JobsService } from './jobs.service.ts';
import { WorkerRuntime } from './worker.runtime.ts';

/** Root module of the worker process (no HTTP server). */
@Module({})
export class WorkerModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: WorkerModule,
      imports: [
        InfrastructureModule.forRoot(config),
        LoggerModule.forRoot({
          pinoHttp: {
            level: config.logLevel,
            redact: { paths: LOG_REDACT_PATHS, censor: '[redacted]' },
            ...(config.appEnv === 'development'
              ? { transport: { target: 'pino-pretty', options: { singleLine: true } } }
              : {}),
          },
        }),
      ],
      providers: [
        JobsService,
        { provide: EMAIL_SENDER, useFactory: () => createEmailSender(config) },
        WorkerRuntime,
      ],
    };
  }
}
