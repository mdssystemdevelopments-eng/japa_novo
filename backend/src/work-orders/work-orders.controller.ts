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
import { WorkOrderStatus } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AuthUserPayload } from '../auth/types/auth-user';
import { PERMISSIONS } from '../common/permissions';
import { CompleteWorkOrderDto } from './dto/complete-work-order.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { WorkOrdersService } from './work-orders.service';

@ApiTags('work-orders')
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private workOrders: WorkOrdersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.WORK_ORDERS_READ)
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page = '1',
    @Query('status') status?: WorkOrderStatus,
  ) {
    return this.workOrders.list(
      user.companyId,
      Math.max(1, parseInt(page, 10) || 1),
      20,
      status,
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.WORK_ORDERS_READ)
  get(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.workOrders.get(user.companyId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.WORK_ORDERS_MANAGE)
  create(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateWorkOrderDto,
    @Req() req: Request,
  ) {
    return this.workOrders.create(user.companyId, user.sub, dto, req.ip);
  }

  @Post(':id/start')
  @RequirePermissions(PERMISSIONS.WORK_ORDERS_MANAGE)
  start(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.workOrders.start(user.companyId, user.sub, id, req.ip);
  }

  @Patch(':id/checklist')
  @RequirePermissions(PERMISSIONS.WORK_ORDERS_MANAGE)
  checklist(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateChecklistDto,
    @Req() req: Request,
  ) {
    return this.workOrders.updateChecklist(user.companyId, user.sub, id, dto, req.ip);
  }

  @Post(':id/complete')
  @RequirePermissions(PERMISSIONS.WORK_ORDERS_MANAGE)
  complete(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: CompleteWorkOrderDto,
    @Req() req: Request,
  ) {
    return this.workOrders.complete(user.companyId, user.sub, id, dto, req.ip);
  }
}
