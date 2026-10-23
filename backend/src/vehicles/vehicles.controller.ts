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
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private vehicles: VehiclesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.VEHICLES_READ)
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('q') q?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.vehicles.list(user.companyId, {
      page: Math.max(1, parseInt(page, 10) || 1),
      pageSize: Math.min(100, parseInt(pageSize, 10) || 20),
      q,
      customerId,
    });
  }

  @Get('similar')
  @RequirePermissions(PERMISSIONS.VEHICLES_MANAGE)
  similar(@CurrentUser() user: AuthUserPayload, @Query('plate') plate: string) {
    return this.vehicles.findSimilar(user.companyId, plate ?? '');
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.VEHICLES_READ)
  get(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.vehicles.getById(user.companyId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.VEHICLES_MANAGE)
  create(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateVehicleDto,
    @Query('force') force?: string,
    @Req() req?: Request,
  ) {
    return this.vehicles.create(
      user.companyId,
      user.sub,
      dto,
      req?.ip,
      force === 'true',
    );
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.VEHICLES_MANAGE)
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @Req() req: Request,
  ) {
    return this.vehicles.update(user.companyId, user.sub, id, dto, req.ip);
  }
}
