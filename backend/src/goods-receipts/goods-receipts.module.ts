import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StockModule } from '../stock/stock.module';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts.service';

@Module({
  imports: [AuditModule, StockModule],
  controllers: [GoodsReceiptsController],
  providers: [GoodsReceiptsService],
})
export class GoodsReceiptsModule {}
