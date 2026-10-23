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
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AuthUserPayload } from '../auth/types/auth-user';
import { PERMISSIONS } from '../common/permissions';
import { CreateBobinaDto } from './dto/create-bobina.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('q') q?: string,
    @Query('all') all?: string,
  ) {
    return this.products.list(user.companyId, {
      page: Math.max(1, parseInt(page, 10) || 1),
      pageSize: Math.min(100, parseInt(pageSize, 10) || 20),
      q,
      activeOnly: all !== 'true',
    });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  get(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.products.getById(user.companyId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCTS_MANAGE)
  create(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateProductDto,
    @Req() req: Request,
  ) {
    return this.products.create(user.companyId, user.sub, dto, req.ip);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_MANAGE)
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: Request,
  ) {
    return this.products.update(user.companyId, user.sub, id, dto, req.ip);
  }

  @Post(':id/bobinas')
  @RequirePermissions(PERMISSIONS.PRODUCTS_MANAGE)
  addBobina(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateBobinaDto,
    @Req() req: Request,
  ) {
    return this.products.addBobina(user.companyId, user.sub, id, dto, req.ip);
  }
}
