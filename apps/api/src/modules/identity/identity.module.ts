import { Module } from '@nestjs/common';

import { AccountService } from './account.service.ts';
import { AuthController } from './auth.controller.ts';
import { AuthService } from './auth.service.ts';
import { CodesService } from './codes.service.ts';
import { MeController } from './me.controller.ts';
import { SessionsService } from './sessions.service.ts';

/** Identity: registration, sessions, verification, password reset and the user's own account. */
@Module({
  controllers: [AuthController, MeController],
  providers: [AuthService, AccountService, SessionsService, CodesService],
  exports: [AccountService],
})
export class IdentityModule {}
