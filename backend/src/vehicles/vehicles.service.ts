import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { normalizePlate } from '../common/validators/plate';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async list(
    companyId: string,
    opts: { page: number; pageSize: number; q?: string; customerId?: string },
  ) {
    const where: Prisma.VehicleWhereInput = { companyId };
    if (opts.customerId) where.customerId = opts.customerId;
    if (opts.q?.trim()) {
      const q = opts.q.trim();
      const plate = normalizePlate(q);
      where.OR = [
        { plate: { contains: plate } },
        { brand: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const skip = (opts.page - 1) * opts.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: opts.pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { items, total, page: opts.page, pageSize: opts.pageSize };
  }

  findSimilar(companyId: string, plate: string) {
    const normalized = normalizePlate(plate);
    if (normalized.length < 3) return [];
    return this.prisma.vehicle.findMany({
      where: {
        companyId,
        plate: { contains: normalized },
      },
      take: 10,
      include: { customer: { select: { id: true, name: true } } },
    });
  }

  async getById(companyId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, companyId },
      include: { customer: { select: { id: true, name: true } } },
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado.');
    return vehicle;
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreateVehicleDto,
    ip?: string,
    force = false,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado.');

    const plate = normalizePlate(dto.plate);
    if (plate.length < 7) {
      throw new ConflictException('Placa inválida.');
    }

    const existing = await this.prisma.vehicle.findUnique({
      where: { companyId_plate: { companyId, plate } },
      include: { customer: { select: { name: true } } },
    });
    if (existing && !force) {
      throw new ConflictException({
        message: 'Placa já cadastrada para esta empresa.',
        existing,
      });
    }
    if (existing && force) {
      throw new ConflictException(
        'Placa já cadastrada. Edite o veículo existente.',
      );
    }

    const vehicle = await this.prisma.vehicle.create({
      data: {
        companyId,
        customerId: dto.customerId,
        brand: dto.brand.trim(),
        model: dto.model.trim(),
        plate,
        manufactureYear: dto.manufactureYear,
        modelYear: dto.modelYear,
        color: dto.color,
        chassis: dto.chassis,
        notes: dto.notes,
      },
      include: { customer: { select: { id: true, name: true } } },
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'Vehicle',
      entityId: vehicle.id,
      ip,
    });

    return vehicle;
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateVehicleDto,
    ip?: string,
  ) {
    await this.getById(companyId, id);

    let plate: string | undefined;
    if (dto.plate) {
      plate = normalizePlate(dto.plate);
      const dup = await this.prisma.vehicle.findFirst({
        where: { companyId, plate, NOT: { id } },
      });
      if (dup) throw new ConflictException('Placa já utilizada.');
    }

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: {
        brand: dto.brand?.trim(),
        model: dto.model?.trim(),
        plate,
        manufactureYear: dto.manufactureYear,
        modelYear: dto.modelYear,
        color: dto.color,
        chassis: dto.chassis,
        notes: dto.notes,
      },
      include: { customer: { select: { id: true, name: true } } },
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Vehicle',
      entityId: id,
      ip,
    });

    return updated;
  }
}
