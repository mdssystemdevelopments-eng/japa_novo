import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { StockModule } from './stock/stock.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { GoodsReceiptsModule } from './goods-receipts/goods-receipts.module';
import { QuotesModule } from './quotes/quotes.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FinanceModule } from './finance/finance.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    CustomersModule,
    VehiclesModule,
    ProductsModule,
    StockModule,
    SuppliersModule,
    GoodsReceiptsModule,
    QuotesModule,
    AppointmentsModule,
    WorkOrdersModule,
    FinanceModule,
    DashboardModule,
    AuditModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
