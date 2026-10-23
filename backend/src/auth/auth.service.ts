import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuditAction, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async assertNotRateLimited(email: string) {
    const since = new Date(Date.now() - LOCK_WINDOW_MS);
    const failures = await this.prisma.loginAttempt.count({
      where: { email: email.toLowerCase(), success: false, createdAt: { gte: since } },
    });
    if (failures >= MAX_FAILED_ATTEMPTS) {
      throw new HttpException(
        'Muitas tentativas de login. Aguarde alguns minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async login(dto: LoginDto, ip?: string) {
    const email = dto.email.toLowerCase().trim();
    await this.assertNotRateLimited(email);

    const user = await this.prisma.user.findFirst({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
        company: true,
      },
    });

    const valid =
      user &&
      user.status === UserStatus.ACTIVE &&
      (await bcrypt.compare(dto.password, user.passwordHash));

    await this.prisma.loginAttempt.create({
      data: { email, success: !!valid, ip },
    });

    if (!valid || !user) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    const tokens = await this.issueTokens(user.id, user.companyId, user.email);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.log({
      companyId: user.companyId,
      userId: user.id,
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user.id,
      ip,
    });

    const permissions = [
      ...new Set(
        user.roles.flatMap((r) =>
          r.role.permissions.map((rp) => rp.permission.key),
        ),
      ),
    ];

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles.map((r) => r.role.code),
        permissions,
        company: {
          id: user.company.id,
          tradeName: user.company.tradeName ?? user.company.legalName,
        },
      },
    };
  }

  async refresh(refreshToken: string) {
    const hash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: hash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!stored || stored.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      stored.userId,
      stored.user.companyId,
      stored.user.email,
    );
  }

  async logout(userId: string, companyId: string, ip?: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.audit.log({
      companyId,
      userId,
      action: AuditAction.LOGOUT,
      entityType: 'User',
      entityId: userId,
      ip,
    });

    return { ok: true };
  }

  private async issueTokens(
    userId: string,
    companyId: string,
    email: string,
  ) {
    const payload = { sub: userId, companyId, email };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_TTL', '15m'),
    });

    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date();
    const ttl = this.config.get('JWT_REFRESH_TTL', '7d');
    const days = ttl.endsWith('d') ? parseInt(ttl, 10) : 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  async requestPasswordReset(email: string) {
    const normalized = email.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({
      where: { email: normalized, status: UserStatus.ACTIVE },
    });

    const response = {
      message:
        'Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.',
    };

    if (!user) {
      return response;
    }

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(token),
        expiresAt,
      },
    });

    const resetUrl = `${this.config.get('APP_PUBLIC_URL', 'http://localhost:3000')}/redefinir-senha?token=${token}`;

    if (this.config.get('NODE_ENV') === 'development') {
      this.logger.warn(
        `Recuperação de senha (desenvolvimento): ${resetUrl}`,
      );
    }

    return response;
  }

  async resetPassword(token: string, newPassword: string) {
    if (newPassword.length < 8) {
      throw new BadRequestException('Senha deve ter no mínimo 8 caracteres.');
    }

    const hash = this.hashToken(token);
    const record = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: hash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!record || record.user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Link inválido ou expirado.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.log({
      companyId: record.user.companyId,
      userId: record.userId,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: record.userId,
      metadata: { passwordReset: true },
    });

    return { message: 'Senha redefinida com sucesso.' };
  }
}
