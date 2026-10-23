import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AuthUserPayload } from '../auth/types/auth-user';
import { PERMISSIONS } from '../common/permissions';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private companies: CompaniesService) {}

  @Get('me')
  @RequirePermissions(PERMISSIONS.COMPANY_READ)
  me(@CurrentUser() user: AuthUserPayload) {
    return this.companies.getMine(user.companyId);
  }

  @Patch('me')
  @RequirePermissions(PERMISSIONS.COMPANY_UPDATE)
  update(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: UpdateCompanyDto,
    @Req() req: Request,
  ) {
    return this.companies.update(user.companyId, user.sub, dto, req.ip);
  }
}
