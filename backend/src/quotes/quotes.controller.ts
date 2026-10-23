import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QuoteStatus } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AuthUserPayload } from '../auth/types/auth-user';
import { PERMISSIONS } from '../common/permissions';
import { ConvertQuoteDto } from './dto/convert-quote.dto';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';
import { QuotesService } from './quotes.service';

@ApiTags('quotes')
@Controller('quotes')
export class QuotesController {
  constructor(private quotes: QuotesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.QUOTES_READ)
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page = '1',
    @Query('status') status?: QuoteStatus,
  ) {
    return this.quotes.list(
      user.companyId,
      Math.max(1, parseInt(page, 10) || 1),
      20,
      status,
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.QUOTES_READ)
  get(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.quotes.get(user.companyId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.QUOTES_MANAGE)
  create(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateQuoteDto,
    @Req() req: Request,
  ) {
    return this.quotes.create(user.companyId, user.sub, dto, req.ip);
  }

  @Post(':id/convert')
  @RequirePermissions(PERMISSIONS.QUOTES_MANAGE, PERMISSIONS.WORK_ORDERS_MANAGE)
  convert(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: ConvertQuoteDto,
    @Req() req: Request,
  ) {
    return this.quotes.convert(user.companyId, user.sub, id, dto, req.ip);
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.QUOTES_MANAGE)
  status(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteStatusDto,
    @Req() req: Request,
  ) {
    return this.quotes.updateStatus(user.companyId, user.sub, id, dto, req.ip);
  }
}
