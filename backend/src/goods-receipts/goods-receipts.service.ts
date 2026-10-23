import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  GoodsReceiptStatus,
  Prisma,
  StockMovementType,
} from '@prisma/client';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { AuditService } from '../audit/audit.service';
import { mapImportRow, parseCsv } from '../common/utils/csv.util';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { resolveStockDelta } from '../stock/stock-movement.util';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { ReceiptItemDto } from './dto/receipt-item.dto';

@Injectable()
export class GoodsReceiptsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private stock: StockService,
  ) {}

  list(companyId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    return Promise.all([
      this.prisma.goodsReceipt.findMany({
        where: { companyId },
        skip,
        take: pageSize,
        orderBy: { receivedAt: 'desc' },
        include: {
          supplier: { select: { id: true, legalName: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.goodsReceipt.count({ where: { companyId } }),
    ]).then(([items, total]) => ({ items, total, page, pageSize }));
  }

  async get(companyId: string, id: string) {
    const receipt = await this.prisma.goodsReceipt.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        items: { orderBy: { lineNumber: 'asc' } },
      },
    });
    if (!receipt) throw new NotFoundException('Entrada não encontrada.');
    return receipt;
  }

  async parseCsvPreview(companyId: string, content: string) {
    const rows = parseCsv(content);
    const mapped = rows.map(mapImportRow).filter((r) => r.description);
    const products = await this.prisma.product.findMany({
      where: { companyId, active: true },
      select: { id: true, internalCode: true, name: true },
    });

    return mapped.map((row, index) => {
      const byCode = products.find(
        (p) =>
          row.code &&
          p.internalCode.toLowerCase() === row.code.toLowerCase(),
      );
      const byName = products.find((p) =>
        p.name.toLowerCase().includes(row.description.toLowerCase().slice(0, 12)),
      );
      const suggested = byCode ?? byName;
      return {
        lineNumber: index + 1,
        ...row,
        productId: suggested?.id,
        extractConfidence: suggested ? 0.85 : 0.4,
      };
    });
  }

  async saveUpload(file: Express.Multer.File) {
    const dir = join(process.cwd(), 'uploads', 'goods-receipts');
    await mkdir(dir, { recursive: true });
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const path = join(dir, safeName);
    await writeFile(path, file.buffer);
    return { fileName: file.originalname, filePath: path };
  }

  async createDraft(
    companyId: string,
    userId: string,
    dto: CreateGoodsReceiptDto,
    fileMeta?: { fileName?: string; filePath?: string },
    ip?: string,
  ) {
    if (!dto.items?.length) {
      throw new BadRequestException('Informe ao menos um item.');
    }

    if (dto.accessKey) {
      const dup = await this.prisma.goodsReceipt.findFirst({
        where: { companyId, accessKey: dto.accessKey },
      });
      if (dup) {
        throw new ConflictException('Documento com esta chave já importado.');
      }
    }

    const receipt = await this.prisma.goodsReceipt.create({
      data: {
        companyId,
        supplierId: dto.supplierId,
        status: GoodsReceiptStatus.DRAFT,
        documentNumber: dto.documentNumber,
        accessKey: dto.accessKey,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        notes: dto.notes,
        fileName: fileMeta?.fileName,
        filePath: fileMeta?.filePath,
        items: {
          create: dto.items.map((item, idx) => this.itemToDb(item, idx + 1)),
        },
      },
      include: { items: true, supplier: true },
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'GoodsReceipt',
      entityId: receipt.id,
      ip,
    });

    return receipt;
  }

  async updateDraft(
    companyId: string,
    userId: string,
    id: string,
    dto: CreateGoodsReceiptDto,
    ip?: string,
  ) {
    const receipt = await this.get(companyId, id);
    if (receipt.status !== GoodsReceiptStatus.DRAFT) {
      throw new ConflictException('Somente entradas em conferência podem ser editadas.');
    }

    await this.prisma.goodsReceiptItem.deleteMany({ where: { receiptId: id } });

    const updated = await this.prisma.goodsReceipt.update({
      where: { id },
      data: {
        supplierId: dto.supplierId,
        documentNumber: dto.documentNumber,
        accessKey: dto.accessKey,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        notes: dto.notes,
        items: {
          create: dto.items.map((item, idx) => this.itemToDb(item, idx + 1)),
        },
      },
      include: { items: true, supplier: true },
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'GoodsReceipt',
      entityId: id,
      ip,
    });

    return updated;
  }

  async confirm(companyId: string, userId: string, id: string, ip?: string) {
    const receipt = await this.get(companyId, id);
    if (receipt.status !== GoodsReceiptStatus.DRAFT) {
      throw new ConflictException('Entrada já confirmada ou cancelada.');
    }

    const missingProduct = receipt.items.find((i) => !i.productId);
    if (missingProduct) {
      throw new BadRequestException(
        'Vincule um produto a cada item antes de confirmar.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of receipt.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId!, companyId },
        });
        if (!product) {
          throw new NotFoundException(`Produto inválido na linha ${item.lineNumber}.`);
        }

        const qty = Number(item.quantity);
        const delta = resolveStockDelta(StockMovementType.GOODS_RECEIPT, qty);
        const current = Number(product.stockQty);
        const next = current + delta;
        if (next < 0) {
          throw new ConflictException('Estoque insuficiente.');
        }

        await this.stock.applyMovementTx(tx, {
          companyId,
          userId,
          productId: product.id,
          type: StockMovementType.GOODS_RECEIPT,
          quantity: qty,
          delta,
          nextStock: next,
          reason: `Entrada NF ${receipt.documentNumber ?? receipt.id}`,
          referenceType: 'GoodsReceipt',
          referenceId: receipt.id,
          idempotencyKey: `receipt-${receipt.id}-line-${item.id}`,
          unitCost: Number(item.unitCost),
        });
      }

      await tx.goodsReceipt.update({
        where: { id },
        data: {
          status: GoodsReceiptStatus.CONFIRMED,
          confirmedAt: new Date(),
          confirmedById: userId,
        },
      });
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.STOCK_ADJUST,
      entityType: 'GoodsReceipt',
      entityId: id,
      metadata: { confirmed: true },
      ip,
    });

    return this.get(companyId, id);
  }

  private itemToDb(item: ReceiptItemDto, lineNumber: number) {
    return {
      lineNumber,
      productId: item.productId,
      description: item.description.trim(),
      ncm: item.ncm,
      quantity: item.quantity,
      unit: item.unit,
      unitCost: item.unitCost ?? 0,
      lot: item.lot,
      extractConfidence: item.extractConfidence,
    };
  }
}
