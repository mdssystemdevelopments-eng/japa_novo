import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  getMine(companyId: string) {
    return this.prisma.company.findUnique({
      where: { id: companyId },
    });
  }

  async update(
    companyId: string,
    userId: string,
    dto: UpdateCompanyDto,
    ip?: string,
  ) {
    const existing = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!existing) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        legalName: dto.legalName,
        tradeName: dto.tradeName,
        document: dto.document,
        phone: dto.phone,
        email: dto.email,
        timezone: dto.timezone,
        locale: dto.locale,
        address: dto.address as Prisma.InputJsonValue | undefined,
      },
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Company',
      entityId: companyId,
      ip,
    });

    return updated;
  }
}
