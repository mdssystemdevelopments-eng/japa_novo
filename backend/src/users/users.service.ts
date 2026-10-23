import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, RoleCode, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async list(companyId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { companyId },
        skip,
        take: pageSize,
        orderBy: { fullName: 'asc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          roles: { include: { role: true } },
        },
      }),
      this.prisma.user.count({ where: { companyId } }),
    ]);
    return {
      items: items.map((u) => ({
        ...u,
        roles: u.roles.map((r) => r.role.code),
      })),
      total,
      page,
      pageSize,
    };
  }

  async create(companyId: string, actorId: string, dto: CreateUserDto, ip?: string) {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.prisma.user.findFirst({
      where: { companyId, email },
    });
    if (exists) {
      throw new ConflictException('E-mail já cadastrado nesta empresa.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const roles = await this.resolveRoles(dto.roles);

    const user = await this.prisma.user.create({
      data: {
        companyId,
        email,
        fullName: dto.fullName.trim(),
        passwordHash,
        status: dto.status ?? UserStatus.ACTIVE,
        roles: {
          create: roles.map((roleId) => ({ roleId })),
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        roles: { include: { role: true } },
      },
    });

    await this.audit.log({
      companyId,
      userId: actorId,
      action: AuditAction.CREATE,
      entityType: 'User',
      entityId: user.id,
      ip,
    });

    return {
      ...user,
      roles: user.roles.map((r) => r.role.code),
    };
  }

  async update(
    companyId: string,
    actorId: string,
    userId: string,
    dto: UpdateUserDto,
    ip?: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (dto.email) {
      const email = dto.email.toLowerCase().trim();
      const dup = await this.prisma.user.findFirst({
        where: { companyId, email, NOT: { id: userId } },
      });
      if (dup) {
        throw new ConflictException('E-mail já cadastrado.');
      }
    }

    const data: Parameters<typeof this.prisma.user.update>[0]['data'] = {
      fullName: dto.fullName?.trim(),
      email: dto.email?.toLowerCase().trim(),
      status: dto.status,
    };

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    if (dto.roles) {
      const roleIds = await this.resolveRoles(dto.roles);
      await this.prisma.userRole.deleteMany({ where: { userId } });
      data.roles = { create: roleIds.map((roleId) => ({ roleId })) };
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        roles: { include: { role: true } },
      },
    });

    await this.audit.log({
      companyId,
      userId: actorId,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: userId,
      ip,
    });

    return {
      ...updated,
      roles: updated.roles.map((r) => r.role.code),
    };
  }

  private async resolveRoles(codes: RoleCode[]) {
    const roles = await this.prisma.role.findMany({
      where: { code: { in: codes } },
    });
    if (roles.length !== codes.length) {
      throw new NotFoundException('Perfil inválido.');
    }
    return roles.map((r) => r.id);
  }
}
