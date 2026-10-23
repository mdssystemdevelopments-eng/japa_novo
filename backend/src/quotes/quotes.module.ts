import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AuditModule } from '../audit/audit.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

@Module({
  imports: [AuditModule, AppointmentsModule, WorkOrdersModule],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
