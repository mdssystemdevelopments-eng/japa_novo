import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AuthUserPayload } from '../auth/types/auth-user';
import { PERMISSIONS } from '../common/permissions';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentsService } from './appointments.service';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private appointments: AppointmentsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ)
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page = '1',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.appointments.list(user.companyId, {
      page: Math.max(1, parseInt(page, 10) || 1),
      pageSize: 50,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ)
  get(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.appointments.get(user.companyId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_MANAGE)
  create(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateAppointmentDto,
    @Req() req: Request,
  ) {
    return this.appointments.create(user.companyId, user.sub, dto, req.ip);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_MANAGE)
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @Req() req: Request,
  ) {
    return this.appointments.update(user.companyId, user.sub, id, dto, req.ip);
  }
}
