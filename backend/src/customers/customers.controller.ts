import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CustomerStatus } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AuthUserPayload } from '../auth/types/auth-user';
import { PERMISSIONS } from '../common/permissions';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private customers: CustomersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CUSTOMERS_READ)
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('q') q?: string,
    @Query('status') status?: CustomerStatus,
  ) {
    return this.customers.list(user.companyId, {
      page: Math.max(1, parseInt(page, 10) || 1),
      pageSize: Math.min(100, parseInt(pageSize, 10) || 20),
      q,
      status,
    });
  }

  @Get('duplicates-check')
  @RequirePermissions(PERMISSIONS.CUSTOMERS_MANAGE)
  duplicatesCheck(
    @CurrentUser() user: AuthUserPayload,
    @Query('document') document?: string,
    @Query('phone') phone?: string,
    @Query('whatsapp') whatsapp?: string,
  ) {
    return this.customers.findDuplicates(user.companyId, {
      name: '',
      document,
      phone,
      whatsapp,
    });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.CUSTOMERS_READ)
  get(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.customers.getById(user.companyId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CUSTOMERS_MANAGE)
  create(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateCustomerDto,
    @Query('force') force?: string,
    @Req() req?: Request,
  ) {
    return this.customers.create(
      user.companyId,
      user.sub,
      dto,
      req?.ip,
      force === 'true',
    );
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.CUSTOMERS_MANAGE)
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @Req() req: Request,
  ) {
    return this.customers.update(user.companyId, user.sub, id, dto, req.ip);
  }

  @Post(':id/archive')
  @RequirePermissions(PERMISSIONS.CUSTOMERS_MANAGE)
  archive(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.customers.archive(user.companyId, user.sub, id, req.ip);
  }
}
