import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, CustomerStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import {
  stripDocument,
  validateDocument,
} from '../common/validators/document';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async list(
    companyId: string,
    opts: {
      page: number;
      pageSize: number;
      q?: string;
      status?: CustomerStatus;
    },
  ) {
    const where: Prisma.CustomerWhereInput = { companyId };
    if (opts.status) where.status = opts.status;
    if (opts.q?.trim()) {
      const q = opts.q.trim();
      const digits = stripDocument(q);
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        ...(digits
          ? [{ document: { contains: digits } }]
          : [{ phone: { contains: q } }, { whatsapp: { contains: q } }]),
      ];
    }

    const skip = (opts.page - 1) * opts.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: opts.pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, total, page: opts.page, pageSize: opts.pageSize };
  }

  async findDuplicates(companyId: string, dto: CreateCustomerDto) {
    const conditions: Prisma.CustomerWhereInput[] = [];
    if (dto.document) {
      const doc = stripDocument(dto.document);
      conditions.push({ companyId, document: doc, status: CustomerStatus.ACTIVE });
    }
    if (dto.phone) {
      conditions.push({
        companyId,
        phone: dto.phone,
        status: CustomerStatus.ACTIVE,
      });
    }
    if (dto.whatsapp) {
      conditions.push({
        companyId,
        whatsapp: dto.whatsapp,
        status: CustomerStatus.ACTIVE,
      });
    }
    if (!conditions.length) return [];
    return this.prisma.customer.findMany({
      where: { OR: conditions },
      take: 10,
      select: {
        id: true,
        name: true,
        document: true,
        phone: true,
        whatsapp: true,
      },
    });
  }

  async getById(companyId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId },
    });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    return customer;
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreateCustomerDto,
    ip?: string,
    force = false,
  ) {
    this.assertDocument(dto.document);
    const document = dto.document ? stripDocument(dto.document) : undefined;

    if (!force) {
      const dupes = await this.findDuplicates(companyId, {
        ...dto,
        document,
      });
      if (dupes.length) {
        throw new ConflictException({
          message: 'Possíveis cadastros duplicados encontrados.',
          duplicates: dupes,
        });
      }
    }

    if (document) {
      const exists = await this.prisma.customer.findFirst({
        where: { companyId, document, status: CustomerStatus.ACTIVE },
      });
      if (exists) {
        throw new ConflictException('CPF ou CNPJ já cadastrado.');
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        companyId,
        name: dto.name.trim(),
        document,
        phone: dto.phone,
        phoneSecondary: dto.phoneSecondary,
        whatsapp: dto.whatsapp,
        email: dto.email?.toLowerCase(),
        postalCode: dto.postalCode,
        street: dto.street,
        streetNumber: dto.streetNumber,
        complement: dto.complement,
        district: dto.district,
        city: dto.city,
        state: dto.state?.toUpperCase(),
        contactOrigin: dto.contactOrigin,
        category: dto.category,
        internalNotes: dto.internalNotes,
        marketingOptIn: dto.marketingOptIn ?? false,
      },
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'Customer',
      entityId: customer.id,
      ip,
    });

    return customer;
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateCustomerDto,
    ip?: string,
  ) {
    await this.getById(companyId, id);
    if (dto.document !== undefined) {
      this.assertDocument(dto.document);
    }

    const document =
      dto.document === undefined
        ? undefined
        : dto.document
          ? stripDocument(dto.document)
          : null;

    if (document) {
      const exists = await this.prisma.customer.findFirst({
        where: {
          companyId,
          document,
          status: CustomerStatus.ACTIVE,
          NOT: { id },
        },
      });
      if (exists) {
        throw new ConflictException('CPF ou CNPJ já cadastrado.');
      }
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        document,
        phone: dto.phone,
        phoneSecondary: dto.phoneSecondary,
        whatsapp: dto.whatsapp,
        email: dto.email?.toLowerCase(),
        postalCode: dto.postalCode,
        street: dto.street,
        streetNumber: dto.streetNumber,
        complement: dto.complement,
        district: dto.district,
        city: dto.city,
        state: dto.state?.toUpperCase(),
        contactOrigin: dto.contactOrigin,
        category: dto.category,
        internalNotes: dto.internalNotes,
        marketingOptIn: dto.marketingOptIn,
      },
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Customer',
      entityId: id,
      ip,
    });

    return updated;
  }

  async archive(companyId: string, userId: string, id: string, ip?: string) {
    await this.getById(companyId, id);
    const updated = await this.prisma.customer.update({
      where: { id },
      data: { status: CustomerStatus.ARCHIVED },
    });
    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Customer',
      entityId: id,
      metadata: { archived: true },
      ip,
    });
    return updated;
  }

  private assertDocument(document?: string) {
    if (!document?.trim()) return;
    if (!validateDocument(document)) {
      throw new BadRequestException('CPF ou CNPJ inválido.');
    }
  }
}
