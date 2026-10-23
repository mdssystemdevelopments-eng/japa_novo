import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, QuoteStatus, Prisma } from '@prisma/client';
import { AppointmentsService } from '../appointments/appointments.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { ConvertQuoteDto } from './dto/convert-quote.dto';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';

@Injectable()
export class QuotesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private appointments: AppointmentsService,
    private workOrders: WorkOrdersService,
  ) {}

  list(companyId: string, page: number, pageSize: number, status?: QuoteStatus) {
    const where: Prisma.QuoteWhereInput = { companyId };
    if (status) where.status = status;
    const skip = (page - 1) * pageSize;
    return Promise.all([
      this.prisma.quote.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        },
      }),
      this.prisma.quote.count({ where }),
    ]).then(([items, total]) => ({ items, total, page, pageSize }));
  }

  get(companyId: string, id: string) {
    return this.prisma.quote
      .findFirst({
        where: { id, companyId },
        include: {
          customer: true,
          vehicle: true,
          items: { orderBy: { sortOrder: 'asc' } },
        },
      })
      .then((q) => {
        if (!q) throw new NotFoundException('Orçamento não encontrado.');
        return q;
      });
  }

  private async nextNumber(companyId: string) {
    const last = await this.prisma.quote.findFirst({
      where: { companyId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    return (last?.number ?? 0) + 1;
  }

  private calcTotals(items: { quantity: number; unitPrice: number }[], discount: number) {
    const subtotal = items.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    );
    const total = Math.max(0, subtotal - discount);
    return { subtotal, total };
  }

  async create(companyId: string, userId: string, dto: CreateQuoteDto, ip?: string) {
    if (!dto.items?.length) {
      throw new BadRequestException('Informe ao menos um item.');
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado.');

    const number = await this.nextNumber(companyId);
    const discount = dto.discount ?? 0;
    const mapped = dto.items.map((item, idx) => {
      const total = item.quantity * item.unitPrice;
      return {
        description: item.description.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total,
        sortOrder: idx,
      };
    });
    const { subtotal, total } = this.calcTotals(mapped, discount);

    const quote = await this.prisma.quote.create({
      data: {
        companyId,
        customerId: dto.customerId,
        vehicleId: dto.vehicleId,
        number,
        status: QuoteStatus.DRAFT,
        subtotal,
        discount,
        total,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        notes: dto.notes,
        items: { create: mapped },
      },
      include: { items: true, customer: true, vehicle: true },
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'Quote',
      entityId: quote.id,
      ip,
    });

    return quote;
  }

  async updateStatus(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateQuoteStatusDto,
    ip?: string,
  ) {
    const quote = await this.get(companyId, id);
    if (
      quote.status === QuoteStatus.APPROVED &&
      dto.status !== QuoteStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Orçamento aprovado exige procedimento de alteração registrada.',
      );
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Quote',
      entityId: id,
      metadata: { status: dto.status },
      ip,
    });

    return updated;
  }

  async convert(
    companyId: string,
    userId: string,
    id: string,
    dto: ConvertQuoteDto,
    ip?: string,
  ) {
    const quote = await this.get(companyId, id);
    if (quote.status !== QuoteStatus.APPROVED) {
      throw new BadRequestException('Aprove o orçamento antes de converter.');
    }

    const existing = await this.prisma.workOrder.findFirst({
      where: { companyId, quoteId: id },
    });
    if (existing) {
      throw new ConflictException('Este orçamento já possui ordem de serviço.');
    }

    const vehicleId = dto.vehicleId ?? quote.vehicleId ?? undefined;
    let appointmentId: string | undefined;

    if (dto.schedule) {
      if (!dto.startsAt || !dto.endsAt) {
        throw new BadRequestException('Informe início e fim do agendamento.');
      }
      const desc =
        quote.items[0]?.description ?? `Serviço orçamento ${quote.number}`;
      const appointment = await this.appointments.create(
        companyId,
        userId,
        {
          customerId: quote.customerId,
          vehicleId,
          serviceDescription: desc,
          startsAt: new Date(dto.startsAt).toISOString(),
          endsAt: new Date(dto.endsAt).toISOString(),
          quoteId: id,
        },
        ip,
      );
      appointmentId = appointment.id;
    }

    const order = await this.workOrders.create(
      companyId,
      userId,
      {
        customerId: quote.customerId,
        vehicleId,
        quoteId: id,
        appointmentId,
      },
      ip,
    );

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Quote',
      entityId: id,
      metadata: { convertedToWorkOrder: order.id },
      ip,
    });

    return { quote, appointmentId, workOrder: order };
  }
}
