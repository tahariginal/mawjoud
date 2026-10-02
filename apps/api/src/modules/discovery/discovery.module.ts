import { Inject, Injectable, Module, type OnModuleInit } from '@nestjs/common';

import { AccountService } from '../identity/account.service.ts';
import { IdentityModule } from '../identity/identity.module.ts';
import { DiscoveryController, FavoritesController } from './discovery.controller.ts';
import { DiscoveryService } from './discovery.service.ts';
import { FavoritesService } from './favorites.service.ts';

/** Deleting an account removes the user's favorites in the same transaction. */
@Injectable()
class FavoritesAccountCleanup implements OnModuleInit {
  constructor(@Inject(AccountService) private readonly accounts: AccountService) {}

  onModuleInit(): void {
    this.accounts.registerDeletionHook(async (trx, userId) => {
      await trx.deleteFrom('favorites').where('user_id', '=', userId).execute();
    });
  }
}

/**
 * Read side for customers: feed, search, offers, stores, favorites. Documented exception to
 * module ownership: it reads offers/locations/inventory directly, read-only
 * (docs/SYSTEM_ARCHITECTURE.md §3.1).
 */
@Module({
  imports: [IdentityModule],
  controllers: [DiscoveryController, FavoritesController],
  providers: [DiscoveryService, FavoritesService, FavoritesAccountCleanup],
})
export class DiscoveryModule {}
