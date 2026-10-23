import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AuthUserPayload } from '../auth/types/auth-user';
import { PERMISSIONS } from '../common/permissions';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliers: SuppliersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SUPPLIERS_READ)
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('q') q?: string,
  ) {
    return this.suppliers.list(
      user.companyId,
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(100, parseInt(pageSize, 10) || 20),
      q,
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SUPPLIERS_READ)
  get(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.suppliers.get(user.companyId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SUPPLIERS_MANAGE)
  create(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateSupplierDto,
    @Req() req: Request,
  ) {
    return this.suppliers.create(user.companyId, user.sub, dto, req.ip);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SUPPLIERS_MANAGE)
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @Req() req: Request,
  ) {
    return this.suppliers.update(user.companyId, user.sub, id, dto, req.ip);
  }
}
