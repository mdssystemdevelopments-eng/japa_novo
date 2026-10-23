import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, UnitOfMeasure } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBobinaDto } from './dto/create-bobina.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async list(
    companyId: string,
    opts: { page: number; pageSize: number; q?: string; activeOnly?: boolean },
  ) {
    const where: Prisma.ProductWhereInput = { companyId };
    if (opts.activeOnly !== false) where.active = true;
    if (opts.q?.trim()) {
      const q = opts.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { internalCode: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q } },
      ];
    }

    const skip = (opts.page - 1) * opts.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: opts.pageSize,
        orderBy: { name: 'asc' },
        include: { _count: { select: { bobinas: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page: opts.page, pageSize: opts.pageSize };
  }

  async getById(companyId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
      include: {
        bobinas: { where: { active: true }, orderBy: { code: 'asc' } },
      },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    return product;
  }

  async create(companyId: string, userId: string, dto: CreateProductDto, ip?: string) {
    const code = dto.internalCode.trim();
    const exists = await this.prisma.product.findUnique({
      where: { companyId_internalCode: { companyId, internalCode: code } },
    });
    if (exists) throw new ConflictException('Código interno já cadastrado.');

    const product = await this.prisma.product.create({
      data: {
        companyId,
        internalCode: code,
        barcode: dto.barcode,
        name: dto.name.trim(),
        description: dto.description,
        category: dto.category,
        brand: dto.brand,
        unitOfMeasure: dto.unitOfMeasure ?? UnitOfMeasure.UN,
        acquisitionCost: dto.acquisitionCost ?? 0,
        averageCost: dto.acquisitionCost ?? 0,
        minStock: dto.minStock ?? 0,
        salePrice: dto.salePrice ?? 0,
        storageLocation: dto.storageLocation,
        ncm: dto.ncm,
        filmType: dto.filmType,
        active: dto.active ?? true,
      },
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'Product',
      entityId: product.id,
      ip,
    });

    return product;
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateProductDto,
    ip?: string,
  ) {
    await this.getById(companyId, id);

    if (dto.internalCode) {
      const code = dto.internalCode.trim();
      const dup = await this.prisma.product.findFirst({
        where: {
          companyId,
          internalCode: code,
          NOT: { id },
        },
      });
      if (dup) throw new ConflictException('Código interno já cadastrado.');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        internalCode: dto.internalCode?.trim(),
        barcode: dto.barcode,
        name: dto.name?.trim(),
        description: dto.description,
        category: dto.category,
        brand: dto.brand,
        unitOfMeasure: dto.unitOfMeasure,
        acquisitionCost: dto.acquisitionCost,
        minStock: dto.minStock,
        salePrice: dto.salePrice,
        storageLocation: dto.storageLocation,
        ncm: dto.ncm,
        filmType: dto.filmType,
        active: dto.active,
      },
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Product',
      entityId: id,
      ip,
    });

    return updated;
  }

  async addBobina(
    companyId: string,
    userId: string,
    productId: string,
    dto: CreateBobinaDto,
    ip?: string,
  ) {
    const product = await this.getById(companyId, productId);
    if (product.unitOfMeasure !== UnitOfMeasure.M) {
      throw new ConflictException(
        'Bobinas só podem ser vinculadas a produtos medidos em metros.',
      );
    }

    const code = dto.code.trim();
    const exists = await this.prisma.bobina.findUnique({
      where: { companyId_code: { companyId, code } },
    });
    if (exists) throw new ConflictException('Código de bobina já cadastrado.');

    const bobina = await this.prisma.$transaction(async (tx) => {
      const created = await tx.bobina.create({
        data: {
          companyId,
          productId,
          code,
          lot: dto.lot,
          initialMeters: dto.initialMeters,
          currentMeters: dto.initialMeters,
          cost: dto.cost ?? 0,
        },
      });
      await tx.product.update({
        where: { id: productId },
        data: { stockQty: { increment: dto.initialMeters } },
      });
      return created;
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'Bobina',
      entityId: bobina.id,
      ip,
    });

    return bobina;
  }
}
