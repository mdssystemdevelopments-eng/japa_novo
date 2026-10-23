import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  list(
    companyId: string,
    opts: { from?: Date; to?: Date; page: number; pageSize: number },
  ) {
    const where: Prisma.AppointmentWhereInput = { companyId };
    if (opts.from || opts.to) {
      where.startsAt = {};
      if (opts.from) where.startsAt.gte = opts.from;
      if (opts.to) where.startsAt.lte = opts.to;
    }

    const skip = (opts.page - 1) * opts.pageSize;
    return Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: opts.pageSize,
        orderBy: { startsAt: 'asc' },
        include: {
          customer: { select: { id: true, name: true } },
          vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]).then(([items, total]) => ({ items, total, page: opts.page, pageSize: opts.pageSize }));
  }

  get(companyId: string, id: string) {
    return this.prisma.appointment
      .findFirst({
        where: { id, companyId },
        include: { customer: true, vehicle: true },
      })
      .then((a) => {
        if (!a) throw new NotFoundException('Agendamento não encontrado.');
        return a;
      });
  }

  private async assertNoOverlap(
    companyId: string,
    startsAt: Date,
    endsAt: Date,
    excludeId?: string,
  ) {
    if (endsAt <= startsAt) {
      throw new ConflictException('Horário final deve ser após o início.');
    }

    const conflict = await this.prisma.appointment.findFirst({
      where: {
        companyId,
        id: excludeId ? { not: excludeId } : undefined,
        status: { notIn: [AppointmentStatus.CANCELLED] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });

    if (conflict) {
      throw new ConflictException(
        'Conflito de horário com outro agendamento ativo.',
      );
    }
  }

  async create(companyId: string, userId: string, dto: CreateAppointmentDto, ip?: string) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    await this.assertNoOverlap(companyId, startsAt, endsAt);

    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado.');

    const appointment = await this.prisma.appointment.create({
      data: {
        companyId,
        customerId: dto.customerId,
        vehicleId: dto.vehicleId,
        serviceDescription: dto.serviceDescription.trim(),
        startsAt,
        endsAt,
        notes: dto.notes,
        quoteId: dto.quoteId,
        status: AppointmentStatus.SCHEDULED,
      },
      include: { customer: true, vehicle: true },
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'Appointment',
      entityId: appointment.id,
      ip,
    });

    return appointment;
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateAppointmentDto,
    ip?: string,
  ) {
    const current = await this.get(companyId, id);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : current.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : current.endsAt;

    if (dto.startsAt || dto.endsAt) {
      await this.assertNoOverlap(companyId, startsAt, endsAt, id);
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        serviceDescription: dto.serviceDescription?.trim(),
        startsAt: dto.startsAt ? startsAt : undefined,
        endsAt: dto.endsAt ? endsAt : undefined,
        notes: dto.notes,
        status: dto.status,
      },
      include: { customer: true, vehicle: true },
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Appointment',
      entityId: id,
      ip,
    });

    return updated;
  }
}
