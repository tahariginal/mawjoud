import { Inject, Injectable, Module, type OnModuleInit } from '@nestjs/common';

import { IdempotencyService } from '../../shared/idempotency/idempotency.ts';
import { AccountService } from '../identity/account.service.ts';
import { IdentityModule } from '../identity/identity.module.ts';
import { MerchantsModule } from '../merchants/merchants.module.ts';
import { ImpactController, OrdersController, PickupsController } from './orders.controller.ts';
import { OrdersService } from './orders.service.ts';
import { PickupsService } from './pickups.service.ts';

/** Deleting an account cancels its open reservations (stock back) in the same transaction. */
@Injectable()
class OrdersAccountCleanup implements OnModuleInit {
  constructor(
    @Inject(AccountService) private readonly accounts: AccountService,
    @Inject(OrdersService) private readonly orders: OrdersService,
  ) {}

  onModuleInit(): void {
    this.accounts.registerDeletionHook((trx, userId) =>
      this.orders.cancelAllOpenForUser(trx, userId),
    );
  }
}

/** Reservations (pay at pickup), pickup validation, merchant counter views, impact. */
@Module({
  imports: [IdentityModule, MerchantsModule],
  controllers: [OrdersController, ImpactController, PickupsController],
  providers: [OrdersService, PickupsService, IdempotencyService, OrdersAccountCleanup],
  exports: [OrdersService],
})
export class OrdersModule {}
