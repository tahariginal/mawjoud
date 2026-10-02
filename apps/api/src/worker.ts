import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { loadConfig } from './config/config.ts';
import { WorkerModule } from './jobs/worker.module.ts';

const config = loadConfig(process.env);

const app = await NestFactory.createApplicationContext(WorkerModule.forRoot(config), {
  bufferLogs: true,
});
app.useLogger(app.get(Logger));
// SIGTERM/SIGINT: stop taking jobs, finish in-flight ones, close connections.
app.enableShutdownHooks();
await app.init();
