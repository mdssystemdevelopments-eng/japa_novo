import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AuthUserPayload } from '../auth/types/auth-user';
import { PERMISSIONS } from '../common/permissions';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { GoodsReceiptsService } from './goods-receipts.service';

@ApiTags('goods-receipts')
@Controller('goods-receipts')
export class GoodsReceiptsController {
  constructor(private receipts: GoodsReceiptsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.GOODS_RECEIPT_READ)
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.receipts.list(
      user.companyId,
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(100, parseInt(pageSize, 10) || 20),
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.GOODS_RECEIPT_READ)
  get(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.receipts.get(user.companyId, id);
  }

  @Post('parse-csv')
  @RequirePermissions(PERMISSIONS.GOODS_RECEIPT_MANAGE)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async parseCsv(
    @CurrentUser() user: AuthUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Envie um arquivo CSV.');
    const ext = file.originalname.toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.txt')) {
      throw new BadRequestException(
        'Formato não suportado nesta etapa. Use CSV. PDF, imagens e XLSX exigem OCR ou parser adicional.',
      );
    }
    const content = file.buffer.toString('utf-8');
    const lines = await this.receipts.parseCsvPreview(user.companyId, content);
    return { lines, fileName: file.originalname };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.GOODS_RECEIPT_MANAGE)
  create(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateGoodsReceiptDto,
    @Req() req: Request,
  ) {
    return this.receipts.createDraft(user.companyId, user.sub, dto, undefined, req.ip);
  }

  @Post('with-file')
  @RequirePermissions(PERMISSIONS.GOODS_RECEIPT_MANAGE)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async createWithFile(
    @CurrentUser() user: AuthUserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body('payload') payloadJson: string,
    @Req() req: Request,
  ) {
    if (!payloadJson) {
      throw new BadRequestException('Campo payload é obrigatório (JSON).');
    }
    const dto = JSON.parse(payloadJson) as CreateGoodsReceiptDto;
    let fileMeta;
    if (file) {
      fileMeta = await this.receipts.saveUpload(file);
    }
    return this.receipts.createDraft(
      user.companyId,
      user.sub,
      dto,
      fileMeta,
      req.ip,
    );
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.GOODS_RECEIPT_MANAGE)
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateGoodsReceiptDto,
    @Req() req: Request,
  ) {
    return this.receipts.updateDraft(user.companyId, user.sub, id, dto, req.ip);
  }

  @Post(':id/confirm')
  @RequirePermissions(PERMISSIONS.GOODS_RECEIPT_MANAGE)
  confirm(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.receipts.confirm(user.companyId, user.sub, id, req.ip);
  }
}
