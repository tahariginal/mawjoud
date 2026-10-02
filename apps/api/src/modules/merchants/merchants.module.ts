import { Module } from '@nestjs/common';

import { AdminController } from '../admin/admin.controller.ts';
import { AdminGuard } from '../admin/admin.guard.ts';
import { AdminService } from '../admin/admin.service.ts';
import { MerchantOffersController } from '../offers/merchant-offers.controller.ts';
import { MerchantOffersService } from '../offers/merchant-offers.service.ts';
import { MerchantAccessService } from './merchant-access.service.ts';
import { MerchantsController } from './merchants.controller.ts';
import { MerchantsService } from './merchants.service.ts';

/** Merchant side: onboarding, businesses, staff, offers; plus admin review of businesses. */
@Module({
  controllers: [MerchantsController, MerchantOffersController, AdminController],
  providers: [
    MerchantsService,
    MerchantAccessService,
    MerchantOffersService,
    AdminService,
    AdminGuard,
  ],
  exports: [MerchantAccessService],
})
export class MerchantsModule {}
