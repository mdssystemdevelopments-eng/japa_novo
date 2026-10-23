import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReceivableStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  listReceivables(
    companyId: string,
    page: number,
    pageSize: number,
    status?: ReceivableStatus,
  ) {
    const where: Prisma.AccountReceivableWhereInput = { companyId };
    if (status) where.status = status;
    const skip = (page - 1) * pageSize;
    return Promise.all([
      this.prisma.accountReceivable.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { dueDate: 'asc' },
        include: {
          customer: { select: { id: true, name: true } },
        },
      }),
      this.prisma.accountReceivable.count({ where }),
    ]).then(([items, total]) => ({ items, total, page, pageSize }));
  }

  async markReceivableReceived(companyId: string, id: string) {
    const row = await this.prisma.accountReceivable.findFirst({
      where: { id, companyId },
    });
    if (!row) throw new NotFoundException('Conta a receber não encontrada.');
    if (row.status === ReceivableStatus.PAID) return row;

    return this.prisma.accountReceivable.update({
      where: { id },
      data: {
        status: ReceivableStatus.PAID,
        receivedAt: new Date(),
      },
    });
  }
}
