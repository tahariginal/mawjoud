import {
  CancelOrderRequest,
  CreateOrderRequest,
  type ImpactSummary,
  type MerchantInsights,
  type MerchantOrder,
  type Order,
  OrdersScope,
  type Page,
  PickupValidateRequest,
  type PickupValidateResult,
  type Quote,
  QuoteRequest,
  ReviewRequest,
} from '@mazal/contracts';
import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';

import { IdempotencyKey } from '../../shared/idempotency/idempotency.ts';
import { type AuthUser, CurrentUser } from '../../shared/security/current-user.ts';
import { OrdersService } from './orders.service.ts';
import { PickupsService } from './pickups.service.ts';

const Id = { schema: z.uuid() };
const ListQuery = z.strictObject({ status: OrdersScope, cursor: z.string().max(1_000).optional() });
const MerchantOrdersQuery = z.strictObject({ locationId: z.uuid() });
const InsightsQuery = z.strictObject({ businessId: z.uuid() });
const MINUTE = 60_000;

/** Customer reservations (docs/API_SPECIFICATION.md §4.6; pay at pickup, ADR-015). */
@Controller('orders')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

  @Post('quote')
  @HttpCode(200)
  quote(@Body({ schema: QuoteRequest }) body: QuoteRequest): Promise<Quote> {
    return this.orders.quote(body);
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  create(
    @CurrentUser() user: AuthUser,
    @IdempotencyKey() key: string,
    @Body({ schema: CreateOrderRequest }) body: CreateOrderRequest,
  ): Promise<Order> {
    return this.orders.create(user.id, body, key);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query({ schema: ListQuery }) query: z.infer<typeof ListQuery>,
  ): Promise<Page<Order>> {
    return this.orders.list(user.id, query.status, query.cursor);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', Id) id: string): Promise<Order> {
    return this.orders.getOrder(user.id, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', Id) id: string,
    @Body({ schema: CancelOrderRequest }) body: CancelOrderRequest,
  ): Promise<Order> {
    // Naturally idempotent (guarded state transition); the Idempotency-Key header is accepted.
    return this.orders.cancel(user.id, id, body.reason);
  }

  @Post(':id/review')
  @HttpCode(204)
  review(
    @CurrentUser() user: AuthUser,
    @Param('id', Id) id: string,
    @Body({ schema: ReviewRequest }) body: ReviewRequest,
  ): Promise<void> {
    return this.orders.review(user.id, id, body);
  }
}

@Controller('me/impact')
export class ImpactController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

  @Get()
  impact(@CurrentUser() user: AuthUser): Promise<ImpactSummary> {
    return this.orders.impact(user.id);
  }
}

/** Counter side: validate pickups, today's list, insights (docs/API_SPECIFICATION.md §4.7). */
@Controller()
export class PickupsController {
  constructor(@Inject(PickupsService) private readonly pickups: PickupsService) {}

  @Post('pickups/validate')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: MINUTE } })
  validate(
    @CurrentUser() user: AuthUser,
    @IdempotencyKey() key: string,
    @Body({ schema: PickupValidateRequest }) body: PickupValidateRequest,
  ): Promise<PickupValidateResult> {
    return this.pickups.validate(user.id, body, key);
  }

  @Get('merchant/orders')
  today(
    @CurrentUser() user: AuthUser,
    @Query({ schema: MerchantOrdersQuery }) query: z.infer<typeof MerchantOrdersQuery>,
  ): Promise<MerchantOrder[]> {
    return this.pickups.todaysOrders(user.id, query.locationId);
  }

  @Get('merchant/insights')
  insights(
    @CurrentUser() user: AuthUser,
    @Query({ schema: InsightsQuery }) query: z.infer<typeof InsightsQuery>,
  ): Promise<MerchantInsights> {
    return this.pickups.insights(user.id, query.businessId);
  }
}
