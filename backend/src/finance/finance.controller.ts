import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReceivableStatus } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AuthUserPayload } from '../auth/types/auth-user';
import { PERMISSIONS } from '../common/permissions';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@Controller('finance')
export class FinanceController {
  constructor(private finance: FinanceService) {}

  @Get('receivables')
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  listReceivables(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page = '1',
    @Query('status') status?: ReceivableStatus,
  ) {
    return this.finance.listReceivables(
      user.companyId,
      Math.max(1, parseInt(page, 10) || 1),
      20,
      status,
    );
  }

  @Post('receivables/:id/receive')
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  receive(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.finance.markReceivableReceived(user.companyId, id);
  }
}
