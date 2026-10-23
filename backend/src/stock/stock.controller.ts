import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AuthUserPayload } from '../auth/types/auth-user';
import { PERMISSIONS } from '../common/permissions';
import { CreateMovementDto } from './dto/create-movement.dto';
import { StockService } from './stock.service';

@ApiTags('stock')
@Controller('stock')
export class StockController {
  constructor(private stock: StockService) {}

  @Get('movements')
  @RequirePermissions(PERMISSIONS.STOCK_READ)
  movements(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('productId') productId?: string,
  ) {
    return this.stock.listMovements(user.companyId, {
      page: Math.max(1, parseInt(page, 10) || 1),
      pageSize: Math.min(100, parseInt(pageSize, 10) || 20),
      productId,
    });
  }

  @Post('movements')
  @RequirePermissions(PERMISSIONS.STOCK_MANAGE)
  createMovement(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateMovementDto,
    @Req() req: Request,
  ) {
    return this.stock.createMovement(user.companyId, user.sub, dto, req.ip);
  }
}
