import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { stripDocument, validateDocument } from '../common/validators/document';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  list(companyId: string, page: number, pageSize: number, q?: string) {
    const where: Prisma.SupplierWhereInput = { companyId, active: true };
    if (q?.trim()) {
      const term = q.trim();
      where.OR = [
        { legalName: { contains: term, mode: 'insensitive' } },
        { tradeName: { contains: term, mode: 'insensitive' } },
        { document: { contains: stripDocument(term) } },
      ];
    }
    const skip = (page - 1) * pageSize;
    return Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { legalName: 'asc' },
      }),
      this.prisma.supplier.count({ where }),
    ]).then(([items, total]) => ({ items, total, page, pageSize }));
  }

  get(companyId: string, id: string) {
    return this.prisma.supplier.findFirst({ where: { id, companyId } }).then((s) => {
      if (!s) throw new NotFoundException('Fornecedor não encontrado.');
      return s;
    });
  }

  async create(companyId: string, userId: string, dto: CreateSupplierDto, ip?: string) {
    const document = dto.document ? stripDocument(dto.document) : undefined;
    if (document && !validateDocument(document)) {
      throw new ConflictException('CNPJ inválido.');
    }
    if (document) {
      const dup = await this.prisma.supplier.findFirst({
        where: { companyId, document, active: true },
      });
      if (dup) throw new ConflictException('CNPJ já cadastrado.');
    }

    const supplier = await this.prisma.supplier.create({
      data: {
        companyId,
        legalName: dto.legalName.trim(),
        tradeName: dto.tradeName?.trim(),
        document,
        stateRegistration: dto.stateRegistration,
        email: dto.email?.toLowerCase(),
        phone: dto.phone,
        paymentTermDays: dto.paymentTermDays,
        notes: dto.notes,
      },
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'Supplier',
      entityId: supplier.id,
      ip,
    });
    return supplier;
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateSupplierDto,
    ip?: string,
  ) {
    await this.get(companyId, id);
    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        legalName: dto.legalName?.trim(),
        tradeName: dto.tradeName?.trim(),
        document: dto.document ? stripDocument(dto.document) : undefined,
        stateRegistration: dto.stateRegistration,
        email: dto.email?.toLowerCase(),
        phone: dto.phone,
        paymentTermDays: dto.paymentTermDays,
        notes: dto.notes,
      },
    });
    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Supplier',
      entityId: id,
      ip,
    });
    return updated;
  }
}
