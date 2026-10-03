import {
  InviteStaffRequest,
  MerchantApplicationRequest,
  type MerchantBusiness,
  SetBusinessHoursRequest,
  type StaffMember,
} from '@mazal/contracts';
import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';

import { type AuthUser, CurrentUser } from '../../shared/security/current-user.ts';
import { MerchantsService } from './merchants.service.ts';

const Id = { schema: z.uuid() };

/** Merchant onboarding, businesses, opening hours and staff (docs/API_SPECIFICATION.md §4.7). */
@Controller('merchant')
export class MerchantsController {
  constructor(@Inject(MerchantsService) private readonly merchants: MerchantsService) {}

  @Post('applications')
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } })
  apply(
    @CurrentUser() user: AuthUser,
    @Body({ schema: MerchantApplicationRequest }) body: MerchantApplicationRequest,
  ): Promise<void> {
    return this.merchants.apply(user.id, body);
  }

  @Get('businesses')
  businesses(@CurrentUser() user: AuthUser): Promise<MerchantBusiness[]> {
    return this.merchants.listBusinesses(user.id);
  }

  @Put('locations/:id/hours')
  @HttpCode(204)
  setHours(
    @CurrentUser() user: AuthUser,
    @Param('id', Id) locationId: string,
    @Body({ schema: SetBusinessHoursRequest }) body: SetBusinessHoursRequest,
  ): Promise<void> {
    return this.merchants.setHours(user.id, locationId, body);
  }

  @Get('businesses/:id/members')
  staff(
    @CurrentUser() user: AuthUser,
    @Param('id', Id) businessId: string,
  ): Promise<StaffMember[]> {
    return this.merchants.listStaff(user.id, businessId);
  }

  @Post('businesses/:id/members')
  @HttpCode(204)
  @Throttle({ default: { limit: 20, ttl: 60 * 60_000 } })
  invite(
    @CurrentUser() user: AuthUser,
    @Param('id', Id) businessId: string,
    @Body({ schema: InviteStaffRequest }) body: InviteStaffRequest,
  ): Promise<void> {
    return this.merchants.inviteStaff(user.id, businessId, body);
  }
}
