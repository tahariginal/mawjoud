import type {
  FavoriteStore,
  HomeFeed,
  OfferDetail,
  OfferSummary,
  Page,
  SearchResults,
  StorePage,
} from '@mawjood/contracts';
import { Controller, Delete, Get, HttpCode, Inject, Param, Put, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';

import { type AuthUser, CurrentUser, OptionalUser } from '../../shared/security/current-user.ts';
import { OptionalAuth, Public } from '../../shared/security/public.decorator.ts';
import {
  OffersQueryParams,
  PointQuery,
  pointOf,
  RequiredPointQuery,
  SearchQuery,
} from './discovery.query.ts';
import { DiscoveryService } from './discovery.service.ts';
import { FavoritesService } from './favorites.service.ts';

const Id = { schema: z.uuid() };
const READ_LIMIT = { default: { limit: 120, ttl: 60_000 } };

/** Customer discovery (docs/API_SPECIFICATION.md §4.4). Browsing never requires an account. */
@Controller()
export class DiscoveryController {
  constructor(@Inject(DiscoveryService) private readonly discovery: DiscoveryService) {}

  @OptionalAuth()
  @Get('feed/home')
  @Throttle(READ_LIMIT)
  home(
    @Query({ schema: RequiredPointQuery }) q: RequiredPointQuery,
    @OptionalUser() user: AuthUser | null,
  ): Promise<HomeFeed> {
    return this.discovery.homeFeed({ lat: q.lat, lng: q.lng }, user?.id ?? null);
  }

  @Public()
  @Get('offers')
  @Throttle(READ_LIMIT)
  offers(@Query({ schema: OffersQueryParams }) q: OffersQueryParams): Promise<Page<OfferSummary>> {
    return this.discovery.listOffers(q);
  }

  @Public()
  @Get('offers/:id')
  offer(
    @Param('id', Id) id: string,
    @Query({ schema: PointQuery }) q: PointQuery,
  ): Promise<OfferDetail> {
    return this.discovery.offerDetail(id, pointOf(q));
  }

  @OptionalAuth()
  @Get('stores/:id')
  store(
    @Param('id', Id) id: string,
    @Query({ schema: PointQuery }) q: PointQuery,
    @OptionalUser() user: AuthUser | null,
  ): Promise<StorePage> {
    return this.discovery.storePage(id, pointOf(q), user?.id ?? null);
  }

  @Public()
  @Get('search')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  search(@Query({ schema: SearchQuery }) q: SearchQuery): Promise<SearchResults> {
    return this.discovery.search(q);
  }
}

/** Favorite stores (docs/API_SPECIFICATION.md §4.5). */
@Controller('favorites')
export class FavoritesController {
  constructor(@Inject(FavoritesService) private readonly favorites: FavoritesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query({ schema: PointQuery }) q: PointQuery,
  ): Promise<FavoriteStore[]> {
    return this.favorites.list(user.id, pointOf(q));
  }

  @Put('stores/:id')
  @HttpCode(204)
  add(@CurrentUser() user: AuthUser, @Param('id', Id) storeId: string): Promise<void> {
    return this.favorites.add(user.id, storeId);
  }

  @Delete('stores/:id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', Id) storeId: string): Promise<void> {
    return this.favorites.remove(user.id, storeId);
  }
}
