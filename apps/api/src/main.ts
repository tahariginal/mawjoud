import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module.ts';
import { configureApp } from './bootstrap.ts';
import { loadConfig } from './config/config.ts';

const config = loadConfig(process.env);

const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(config), {
  bufferLogs: true,
  // Body parsing is configured explicitly (size limit) in configureApp.
  bodyParser: false,
});
configureApp(app, config);
await app.listen(config.port, '0.0.0.0');
