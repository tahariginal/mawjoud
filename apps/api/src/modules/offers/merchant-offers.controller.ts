import {
  type MerchantOffer,
  MerchantOfferInput,
  UpdateMerchantOfferRequest,
} from '@mazal/contracts';
import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';

import { type AuthUser, CurrentUser } from '../../shared/security/current-user.ts';
import { MerchantOffersService } from './merchant-offers.service.ts';

const Id = { schema: z.uuid() };
const ListQuery = z.strictObject({ businessId: z.uuid() });
const Action = { schema: z.enum(['pause', 'resume', 'end']) };

/** Offer management for business owners (docs/API_SPECIFICATION.md §4.7). */
@Controller('merchant/offers')
export class MerchantOffersController {
  constructor(@Inject(MerchantOffersService) private readonly offers: MerchantOffersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query({ schema: ListQuery }) query: z.infer<typeof ListQuery>,
  ): Promise<MerchantOffer[]> {
    return this.offers.list(user.id, query.businessId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', Id) id: string): Promise<MerchantOffer> {
    return this.offers.get(user.id, id);
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 30, ttl: 60 * 60_000 } })
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: MerchantOfferInput }) body: MerchantOfferInput,
  ): Promise<MerchantOffer> {
    return this.offers.create(user.id, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', Id) id: string,
    @Body({ schema: UpdateMerchantOfferRequest }) body: UpdateMerchantOfferRequest,
  ): Promise<MerchantOffer> {
    return this.offers.update(user.id, id, body);
  }

  @Post(':id/:action')
  @HttpCode(200)
  lifecycle(
    @CurrentUser() user: AuthUser,
    @Param('id', Id) id: string,
    @Param('action', Action) action: 'pause' | 'resume' | 'end',
  ): Promise<MerchantOffer> {
    return this.offers.setLifecycle(user.id, id, action);
  }
}
