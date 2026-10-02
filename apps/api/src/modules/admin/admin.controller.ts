import {
  type AdminBusiness,
  AdminBusinessQuery,
  AdminDecisionRequest,
  type BusinessStatus,
} from '@mawjood/contracts';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { type AuthUser, CurrentUser, RequestId } from '../../shared/security/current-user.ts';
import { AdminGuard } from './admin.guard.ts';
import { AdminService } from './admin.service.ts';

const Id = { schema: z.uuid() };
const Decision = { schema: z.enum(['approve', 'reject', 'suspend']) };

/** Minimal admin API until the admin web app (Phase 9): merchant review. */
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(@Inject(AdminService) private readonly admin: AdminService) {}

  @Get('businesses')
  businesses(
    @Query({ schema: AdminBusinessQuery }) query: { status: BusinessStatus },
  ): Promise<AdminBusiness[]> {
    return this.admin.listBusinesses(query.status);
  }

  @Post('businesses/:id/:decision')
  @HttpCode(204)
  decide(
    @CurrentUser() user: AuthUser,
    @RequestId() requestId: string,
    @Param('id', Id) businessId: string,
    @Param('decision', Decision) decision: 'approve' | 'reject' | 'suspend',
    @Body({ schema: AdminDecisionRequest }) body: AdminDecisionRequest,
  ): Promise<void> {
    return this.admin.decide(user.id, businessId, decision, body.reason, requestId);
  }
}
