import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, StockMovementType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { resolveStockDelta } from './stock-movement.util';

@Injectable()
export class StockService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async listMovements(
    companyId: string,
    opts: { page: number; pageSize: number; productId?: string },
  ) {
    const where: Prisma.StockMovementWhereInput = { companyId };
    if (opts.productId) where.productId = opts.productId;

    const skip = (opts.page - 1) * opts.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: opts.pageSize,
        orderBy: { occurredAt: 'desc' },
        include: {
          product: {
            select: { id: true, name: true, internalCode: true, unitOfMeasure: true },
          },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { items, total, page: opts.page, pageSize: opts.pageSize };
  }

  async createMovement(
    companyId: string,
    userId: string,
    dto: CreateMovementDto,
    ip?: string,
  ) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.stockMovement.findUnique({
        where: {
          companyId_idempotencyKey: {
            companyId,
            idempotencyKey: dto.idempotencyKey,
          },
        },
        include: { product: true },
      });
      if (existing) return existing;
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, companyId, active: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');

    const delta = resolveStockDelta(dto.type, dto.quantity);
    if (delta === 0) {
      throw new BadRequestException('Quantidade inválida.');
    }

    const current = Number(product.stockQty);
    const next = current + delta;
    if (next < 0) {
      throw new ConflictException('Estoque insuficiente para esta saída.');
    }

    const qtyStored = Math.abs(dto.quantity);

    const movement = await this.prisma.$transaction(async (tx) => {
      return this.applyMovementTx(tx, {
        companyId,
        userId,
        productId: dto.productId,
        type: dto.type,
        quantity: qtyStored,
        delta,
        nextStock: next,
        reason: dto.reason.trim(),
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        idempotencyKey: dto.idempotencyKey,
        unitCost: dto.unitCost,
      });
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.STOCK_ADJUST,
      entityType: 'StockMovement',
      entityId: movement.id,
      metadata: { productId: dto.productId, delta },
      ip,
    });

    return movement;
  }

  applyMovementTx(
    tx: Prisma.TransactionClient,
    input: {
      companyId: string;
      userId: string;
      productId: string;
      type: StockMovementType;
      quantity: number;
      delta: number;
      nextStock: number;
      reason: string;
      referenceType?: string;
      referenceId?: string;
      idempotencyKey?: string;
      unitCost?: number;
    },
  ) {
    const productUpdate: Prisma.ProductUpdateInput = {
      stockQty: input.nextStock,
    };
    if (
      input.unitCost != null &&
      input.type === StockMovementType.GOODS_RECEIPT &&
      input.delta > 0
    ) {
      productUpdate.averageCost = input.unitCost;
      productUpdate.acquisitionCost = input.unitCost;
    }

    return tx.stockMovement.create({
      data: {
        companyId: input.companyId,
        productId: input.productId,
        userId: input.userId,
        type: input.type,
        quantity: input.quantity,
        reason: input.reason,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        idempotencyKey: input.idempotencyKey,
      },
      include: {
        product: {
          select: { id: true, name: true, internalCode: true, unitOfMeasure: true },
        },
      },
    }).then(async (created) => {
      await tx.product.update({
        where: { id: input.productId },
        data: productUpdate,
      });
      return created;
    });
  }
}
