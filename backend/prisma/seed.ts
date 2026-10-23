import {
  PrismaClient,
  RoleCode,
  UserStatus,
  WhatsappMessageStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  ALL_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
} from '../src/common/permissions';

const prisma = new PrismaClient();

const ROLE_LABELS: Record<RoleCode, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE: 'Gerente',
  ATENDENTE: 'Atendente',
  TECNICO: 'Técnico',
  FINANCEIRO: 'Financeiro',
};

async function main() {
  for (const key of ALL_PERMISSIONS) {
    const [module] = key.split('.');
    await prisma.permission.upsert({
      where: { key },
      create: {
        key,
        module,
        description: key,
      },
      update: {},
    });
  }

  for (const code of Object.values(RoleCode)) {
    await prisma.role.upsert({
      where: { code },
      create: {
        code,
        name: ROLE_LABELS[code],
        description: ROLE_LABELS[code],
      },
      update: { name: ROLE_LABELS[code] },
    });
  }

  const permissions = await prisma.permission.findMany();
  const permByKey = new Map(permissions.map((p) => [p.key, p.id]));

  for (const [code, keys] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { code: code as RoleCode },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const key of keys) {
      const permissionId = permByKey.get(key);
      if (!permissionId) continue;
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId },
      });
    }
  }

  let company = await prisma.company.findFirst({
    where: { legalName: 'Japa Insufilm Ltda' },
  });
  if (!company) {
    company = await prisma.company.create({
      data: {
        legalName: 'Japa Insufilm Ltda',
        tradeName: 'Japa Insufilm',
        phone: '',
        email: 'contato@japainsufilm.local',
        timezone: 'America/Sao_Paulo',
        locale: 'pt-BR',
      },
    });
  }

  await prisma.whatsappConfig.upsert({
    where: { companyId: company.id },
    create: {
      companyId: company.id,
      connectionState: 'disconnected',
    },
    update: {},
  });

  const adminEmail =
    process.env.SEED_ADMIN_EMAIL ?? 'admin@japainsufilm.local';
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? 'AlterarSenha123!';

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { code: RoleCode.ADMINISTRADOR },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: {
      companyId_email: { companyId: company.id, email: adminEmail },
    },
    create: {
      companyId: company.id,
      email: adminEmail,
      fullName: 'Administrador',
      passwordHash,
      status: UserStatus.ACTIVE,
      roles: { create: [{ roleId: adminRole.id }] },
    },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    create: { userId: admin.id, roleId: adminRole.id },
    update: {},
  });

  const waConfig = await prisma.whatsappConfig.findUniqueOrThrow({
    where: { companyId: company.id },
  });

  const failedCount = await prisma.whatsappMessage.count({
    where: { configId: waConfig.id, status: WhatsappMessageStatus.FAILED },
  });
  if (failedCount === 0) {
    // nenhum dado fictício de operação; apenas estrutura pronta
  }

  console.log('Seed concluído.');
  console.log(`Empresa: ${company.tradeName} (${company.id})`);
  console.log(`Administrador: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
