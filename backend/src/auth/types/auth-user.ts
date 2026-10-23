import { RoleCode } from '@prisma/client';

export type AuthUserPayload = {
  sub: string;
  companyId: string;
  email: string;
  fullName: string;
  roles: RoleCode[];
  permissions: string[];
};
