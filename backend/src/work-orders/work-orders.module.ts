import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StockModule } from '../stock/stock.module';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

@Module({
  imports: [AuditModule, StockModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
