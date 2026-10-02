import { RequestMethod } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import type { AppConfig } from './config/config.ts';

export const API_PREFIX = 'api/v1';

/** HTTP-level setup shared by the real server and the test harness. */
export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
  app.use(helmet());
  app.useBodyParser('json', { limit: '100kb' });
  app.enableCors({
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
    credentials: false,
  });
  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  // Graceful shutdown: SIGTERM stops accepting connections and closes pools.
  app.enableShutdownHooks();
}
