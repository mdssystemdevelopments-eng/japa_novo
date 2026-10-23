import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUserPayload } from '../auth/types/auth-user';
import { PERMISSIONS } from '../common/permissions';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  async list(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const skip = (p - 1) * ps;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { companyId: user.companyId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: ps,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where: { companyId: user.companyId } }),
    ]);

    return { items, total, page: p, pageSize: ps };
  }
}
