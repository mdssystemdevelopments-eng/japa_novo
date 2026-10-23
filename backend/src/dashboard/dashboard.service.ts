import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  FinancialMovementType,
  QuoteStatus,
  ReceivableStatus,
  WhatsappMessageStatus,
  WorkOrderStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function startOfDayInTz(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return new Date(`${y}-${m}-${d}T00:00:00`);
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(companyId: string, from?: string, to?: string) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });
    const tz = company.timezone;

    const now = new Date();
    const periodFrom = from
      ? new Date(from)
      : startOfDayInTz(
          new Date(now.getFullYear(), now.getMonth(), 1),
          tz,
        );
    const periodTo = to ? new Date(to) : now;

    const dayStart = startOfDayInTz(now, tz);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [
      appointmentsToday,
      workOrdersInProgress,
      servicesCompleted,
      quotesAwaiting,
      whatsappFailures,
      recentReceipts,
      upcomingAppointments,
      recentFinancial,
      receivableOpen,
      payableOpen,
      revenueInflows,
      expenseOutflows,
    ] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          companyId,
          startsAt: { gte: dayStart, lt: dayEnd },
          status: { notIn: [AppointmentStatus.CANCELLED] },
        },
      }),
      this.prisma.workOrder.count({
        where: {
          companyId,
          status: WorkOrderStatus.IN_PROGRESS,
        },
      }),
      this.prisma.workOrder.count({
        where: {
          companyId,
          status: WorkOrderStatus.COMPLETED,
          completedAt: { gte: periodFrom, lte: periodTo },
        },
      }),
      this.prisma.quote.count({
        where: {
          companyId,
          status: {
            in: [QuoteStatus.SENT, QuoteStatus.AWAITING_RESPONSE],
          },
        },
      }),
      this.prisma.whatsappMessage.count({
        where: {
          config: { companyId },
          status: WhatsappMessageStatus.FAILED,
        },
      }),
      this.prisma.goodsReceipt.findMany({
        where: { companyId },
        orderBy: { receivedAt: 'desc' },
        take: 5,
      }),
      this.prisma.appointment.findMany({
        where: {
          companyId,
          startsAt: { gte: now },
          status: { notIn: [AppointmentStatus.CANCELLED] },
        },
        orderBy: { startsAt: 'asc' },
        take: 8,
        include: {
          customer: { select: { name: true } },
          vehicle: { select: { brand: true, model: true, plate: true } },
        },
      }),
      this.prisma.financialMovement.findMany({
        where: { companyId },
        orderBy: { occurredAt: 'desc' },
        take: 10,
      }),
      this.prisma.accountReceivable.aggregate({
        where: {
          companyId,
          status: { in: [ReceivableStatus.OPEN, ReceivableStatus.PARTIAL] },
        },
        _sum: { amount: true },
      }),
      this.prisma.accountPayable.aggregate({
        where: {
          companyId,
          status: { in: ['OPEN', 'PARTIAL'] },
        },
        _sum: { amount: true },
      }),
      this.prisma.financialMovement.aggregate({
        where: {
          companyId,
          type: FinancialMovementType.INFLOW,
          occurredAt: { gte: periodFrom, lte: periodTo },
        },
        _sum: { amount: true },
      }),
      this.prisma.financialMovement.aggregate({
        where: {
          companyId,
          type: FinancialMovementType.OUTFLOW,
          occurredAt: { gte: periodFrom, lte: periodTo },
        },
        _sum: { amount: true },
      }),
    ]);

    let lowStock = 0;
    const products = await this.prisma.product.findMany({
      where: { companyId, active: true },
      select: { stockQty: true, minStock: true },
    });
    lowStock = products.filter(
      (p) => Number(p.stockQty) < Number(p.minStock),
    ).length;

    const inflows = Number(revenueInflows._sum.amount ?? 0);
    const outflows = Number(expenseOutflows._sum.amount ?? 0);

    return {
      period: { from: periodFrom.toISOString(), to: periodTo.toISOString() },
      indicators: {
        appointmentsToday,
        workOrdersInProgress,
        servicesCompletedInPeriod: servicesCompleted,
        quotesAwaitingResponse: quotesAwaiting,
        billingInPeriod: inflows,
        receivableOpen: Number(receivableOpen._sum.amount ?? 0),
        payableOpen: Number(payableOpen._sum.amount ?? 0),
        lowStockProducts: lowStock,
        whatsappFailures,
        profitInPeriod: inflows - outflows,
      },
      recentGoodsReceipts: recentReceipts,
      upcomingAppointments,
      recentFinancialMovements: recentFinancial,
    };
  }
}
