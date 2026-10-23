import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  Prisma,
  QuoteStatus,
  ReceivableStatus,
  StockMovementType,
  WorkOrderStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { resolveStockDelta } from '../stock/stock-movement.util';
import { CompleteWorkOrderDto } from './dto/complete-work-order.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { DEFAULT_WORK_ORDER_CHECKLIST } from './work-order-checklist';

@Injectable()
export class WorkOrdersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private stock: StockService,
  ) {}

  list(companyId: string, page: number, pageSize: number, status?: WorkOrderStatus) {
    const where: Prisma.WorkOrderWhereInput = { companyId };
    if (status) where.status = status;
    const skip = (page - 1) * pageSize;
    return Promise.all([
      this.prisma.workOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        },
      }),
      this.prisma.workOrder.count({ where }),
    ]).then(([items, total]) => ({ items, total, page, pageSize }));
  }

  get(companyId: string, id: string) {
    return this.prisma.workOrder
      .findFirst({
        where: { id, companyId },
        include: {
          customer: true,
          vehicle: true,
          quote: true,
          appointment: true,
          items: true,
          materials: { include: { product: true, bobina: true } },
        },
      })
      .then((o) => {
        if (!o) throw new NotFoundException('Ordem de serviço não encontrada.');
        return o;
      });
  }

  private async nextNumber(companyId: string) {
    const last = await this.prisma.workOrder.findFirst({
      where: { companyId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    return (last?.number ?? 0) + 1;
  }

  async create(companyId: string, userId: string, dto: CreateWorkOrderDto, ip?: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado.');

    let items = dto.items ?? [];
    let total = 0;
    let quoteId = dto.quoteId;

    if (quoteId) {
      const quote = await this.prisma.quote.findFirst({
        where: { id: quoteId, companyId },
        include: { items: true },
      });
      if (!quote) throw new NotFoundException('Orçamento não encontrado.');
      if (quote.status !== QuoteStatus.APPROVED) {
        throw new BadRequestException('Orçamento precisa estar aprovado.');
      }
      items = quote.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
      }));
      total = Number(quote.total);
    }

    const mapped = items.map((i) => {
      const qty = i.quantity ?? 1;
      const price = i.unitPrice ?? 0;
      return {
        description: i.description,
        quantity: qty,
        unitPrice: price,
        total: qty * price,
      };
    });
    if (!quoteId) {
      total = mapped.reduce((s, i) => s + i.total, 0);
    }

    const number = await this.nextNumber(companyId);
    const checklist = DEFAULT_WORK_ORDER_CHECKLIST.map((c) => ({ ...c }));

    const order = await this.prisma.workOrder.create({
      data: {
        companyId,
        customerId: dto.customerId,
        vehicleId: dto.vehicleId,
        quoteId,
        appointmentId: dto.appointmentId,
        number,
        status: dto.appointmentId ? WorkOrderStatus.SCHEDULED : WorkOrderStatus.QUOTED,
        total,
        notes: dto.notes,
        checklist,
        items: mapped.length ? { create: mapped } : undefined,
      },
      include: { items: true, customer: true, vehicle: true },
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'WorkOrder',
      entityId: order.id,
      ip,
    });

    return order;
  }

  async start(companyId: string, userId: string, id: string, ip?: string) {
    const order = await this.get(companyId, id);
    if (
      order.status !== WorkOrderStatus.SCHEDULED &&
      order.status !== WorkOrderStatus.QUOTED
    ) {
      throw new ConflictException('Situação não permite iniciar execução.');
    }
    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status: WorkOrderStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });
    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'WorkOrder',
      entityId: id,
      metadata: { started: true },
      ip,
    });
    return updated;
  }

  async updateChecklist(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateChecklistDto,
    ip?: string,
  ) {
    await this.get(companyId, id);
    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: { checklist: dto.checklist as unknown as Prisma.InputJsonValue },
    });
    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'WorkOrder',
      entityId: id,
      metadata: { checklist: true },
      ip,
    });
    return updated;
  }

  async complete(
    companyId: string,
    userId: string,
    id: string,
    dto: CompleteWorkOrderDto,
    ip?: string,
  ) {
    const order = await this.get(companyId, id);

    if (order.status === WorkOrderStatus.COMPLETED && order.stockConsumedAt) {
      return order;
    }

    if (order.status !== WorkOrderStatus.IN_PROGRESS) {
      throw new ConflictException('Inicie a ordem de serviço antes de concluir.');
    }

    if (!dto.materials?.length) {
      throw new BadRequestException('Informe os materiais utilizados.');
    }

    await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.workOrder.findUnique({ where: { id } });
      if (fresh?.stockConsumedAt) return;

      await tx.workOrderMaterial.deleteMany({ where: { workOrderId: id } });

      for (const mat of dto.materials) {
        const product = await tx.product.findFirst({
          where: { id: mat.productId, companyId },
        });
        if (!product) {
          throw new NotFoundException('Produto não encontrado.');
        }

        if (mat.bobinaId) {
          const bobina = await tx.bobina.findFirst({
            where: { id: mat.bobinaId, companyId, productId: mat.productId },
          });
          if (!bobina) throw new NotFoundException('Bobina não encontrada.');
          const remaining = Number(bobina.currentMeters) - mat.quantity;
          if (remaining < 0) {
            throw new ConflictException(
              `Metragem insuficiente na bobina ${bobina.code}.`,
            );
          }
          await tx.bobina.update({
            where: { id: bobina.id },
            data: { currentMeters: remaining },
          });
        }

        const delta = resolveStockDelta(StockMovementType.WORK_ORDER_ISSUE, mat.quantity);
        const current = Number(product.stockQty);
        const next = current + delta;
        if (next < 0) {
          throw new ConflictException(`Estoque insuficiente: ${product.name}.`);
        }

        await this.stock.applyMovementTx(tx, {
          companyId,
          userId,
          productId: product.id,
          type: StockMovementType.WORK_ORDER_ISSUE,
          quantity: mat.quantity,
          delta,
          nextStock: next,
          reason: `OS ${order.number}`,
          referenceType: 'WorkOrder',
          referenceId: id,
          idempotencyKey: `wo-${id}-product-${product.id}-${mat.bobinaId ?? 'na'}`,
        });

        await tx.workOrderMaterial.create({
          data: {
            workOrderId: id,
            productId: mat.productId,
            bobinaId: mat.bobinaId,
            quantity: mat.quantity,
          },
        });
      }

      await tx.workOrder.update({
        where: { id },
        data: {
          status: WorkOrderStatus.COMPLETED,
          completedAt: new Date(),
          stockConsumedAt: new Date(),
          notes: dto.notes ?? order.notes,
        },
      });

      await tx.accountReceivable.create({
        data: {
          companyId,
          customerId: order.customerId,
          description: `Ordem de serviço ${order.number}`,
          amount: order.total,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: ReceivableStatus.OPEN,
        },
      });
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'WorkOrder',
      entityId: id,
      metadata: { completed: true },
      ip,
    });

    return this.get(companyId, id);
  }
}
