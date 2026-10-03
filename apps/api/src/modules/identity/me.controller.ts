import {
  DeleteAccountRequest,
  type Me,
  NotificationPreferences,
  UpdateMeRequest,
} from '@mazal/contracts';
import { Body, Controller, Delete, Get, HttpCode, Inject, Patch, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { type AuthUser, CurrentUser } from '../../shared/security/current-user.ts';
import { AccountService } from './account.service.ts';

/** The signed-in user's account (docs/API_SPECIFICATION.md §4.3). */
@Controller('me')
export class MeController {
  constructor(@Inject(AccountService) private readonly accounts: AccountService) {}

  @Get()
  me(@CurrentUser() user: AuthUser): Promise<Me> {
    return this.accounts.getMe(user.id);
  }

  @Patch()
  update(
    @CurrentUser() user: AuthUser,
    @Body({ schema: UpdateMeRequest }) body: UpdateMeRequest,
  ): Promise<Me> {
    return this.accounts.updateMe(user.id, body);
  }

  @Delete()
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } })
  remove(
    @CurrentUser() user: AuthUser,
    @Body({ schema: DeleteAccountRequest }) body: DeleteAccountRequest,
  ): Promise<void> {
    return this.accounts.deleteAccount(user.id, body.password);
  }

  @Get('notification-preferences')
  preferences(@CurrentUser() user: AuthUser): Promise<NotificationPreferences> {
    return this.accounts.getNotificationPreferences(user.id);
  }

  @Put('notification-preferences')
  setPreferences(
    @CurrentUser() user: AuthUser,
    @Body({ schema: NotificationPreferences }) body: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    return this.accounts.setNotificationPreferences(user.id, body);
  }
}
