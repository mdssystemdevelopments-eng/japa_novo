import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUserPayload } from '../auth/types/auth-user';
import { PERMISSIONS } from '../common/permissions';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('summary')
  @RequirePermissions(PERMISSIONS.DASHBOARD_READ)
  summary(
    @CurrentUser() user: AuthUserPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboard.getSummary(user.companyId, from, to);
  }
}
