import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { assertPasswordPolicy } from '../common/utils/password-policy.util';
import { AUTH_ERROR_CODES } from './auth-error.codes';
import {
  extractPermissions,
  isCompanyAccessActive,
  isUserAccessActive,
} from './auth-permissions';
import {
  formatLockMessage,
  getLoginSecurityConfig,
  getRetryAfterSeconds,
} from './login-security.config';

const DUMMY_PASSWORD_HASH =
  '$2b$12$CWPJO/SufF3MKfBcaQ7QYukHNEJ8n6jWJxhnx3Ybc048ykTBNXgGG';

type UserWithRoles = {
  id: string;
  companyId: string;
  fullName: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  archivedAt: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  userRoles: Array<{
    role: {
      permissions: Array<{
        isGranted: boolean;
        permission: { code: string; isActive: boolean };
      }>;
    };
  }>;
};

const USER_AUTH_INCLUDE = {
  userRoles: {
    include: {
      role: {
        include: {
          permissions: {
            where: { isGranted: true },
            include: { permission: true },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<LoginResponseDto> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const companyCode = dto.companyCode.trim();
    const securityConfig = getLoginSecurityConfig(this.configService);

    const company = await this.prisma.company.findFirst({
      where: {
        code: { equals: companyCode, mode: 'insensitive' },
      },
      select: {
        id: true,
        isActive: true,
        archivedAt: true,
      },
    });

    const userRecord =
      isCompanyAccessActive(company) && company
        ? await this.prisma.user.findUnique({
            where: {
              companyId_normalizedEmail: {
                companyId: company.id,
                normalizedEmail,
              },
            },
            include: USER_AUTH_INCLUDE,
          })
        : null;

    const passwordHash = userRecord?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordValid = await bcrypt.compare(dto.password, passwordHash);

    if (!isUserAccessActive(userRecord)) {
      throw this.invalidCredentials();
    }

    let user = userRecord as UserWithRoles;
    user = await this.clearExpiredLockIfNeeded(user);

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      if (passwordValid) {
        const retryAfterSeconds = getRetryAfterSeconds(user.lockedUntil);
        throw new HttpException(
          {
            message: formatLockMessage(retryAfterSeconds),
            code: AUTH_ERROR_CODES.ACCOUNT_LOCKED,
            retryAfterSeconds,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw this.invalidCredentials();
    }

    if (!passwordValid) {
      await this.recordFailedLogin(
        user,
        securityConfig.maxFailedAttempts,
        securityConfig.lockDurationMinutes,
        ipAddress,
        userAgent,
      );
      throw this.invalidCredentials();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const permissions = extractPermissions(user.userRoles);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      permissions,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    const refreshToken = await this.createRefreshToken(user.id);

    await this.auditService.log({
      companyId: user.companyId,
      actorUserId: user.id,
      module: 'auth',
      action: 'login_success',
      recordType: 'user',
      recordId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        companyId: user.companyId,
        permissions,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    };
  }

  async refresh(refreshToken: string): Promise<LoginResponseDto['tokens']> {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            company: {
              select: {
                id: true,
                isActive: true,
                archivedAt: true,
              },
            },
            ...USER_AUTH_INCLUDE,
          },
        },
      },
    });

    if (!stored || !isUserAccessActive(stored.user) || !isCompanyAccessActive(stored.user.company)) {
      if (stored) {
        await this.revokeRefreshTokens(stored.userId);
      }
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    if (stored.user.lockedUntil && stored.user.lockedUntil > new Date()) {
      throw new ForbiddenException({
        message: 'Account temporarily locked.',
        code: AUTH_ERROR_CODES.ACCOUNT_LOCKED,
      });
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const permissions = extractPermissions(stored.user.userRoles);
    const payload: JwtPayload = {
      sub: stored.user.id,
      email: stored.user.email,
      companyId: stored.user.companyId,
      permissions,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    const newRefreshToken = await this.createRefreshToken(stored.user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    };
  }

  async logout(userId: string, companyId: string, ipAddress?: string): Promise<void> {
    await this.revokeRefreshTokens(userId);

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'auth',
      action: 'logout',
      recordType: 'user',
      recordId: userId,
      ipAddress,
    });
  }

  async getProfile(userId: string): Promise<LoginResponseDto['user']> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          select: {
            id: true,
            isActive: true,
            archivedAt: true,
          },
        },
        ...USER_AUTH_INCLUDE,
      },
    });

    if (!user || !isUserAccessActive(user) || !isCompanyAccessActive(user.company)) {
      throw new ForbiddenException({
        message: 'User account is not active.',
        code: AUTH_ERROR_CODES.ACCOUNT_INACTIVE,
      });
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      companyId: user.companyId,
      permissions: extractPermissions(user.userRoles),
    };
  }

  async changePassword(
    userId: string,
    companyId: string,
    dto: ChangePasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
        isActive: true,
        archivedAt: null,
      },
    });

    if (!user) {
      throw new ForbiddenException({
        message: 'User account is not active.',
        code: AUTH_ERROR_CODES.ACCOUNT_INACTIVE,
      });
    }

    const currentPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    assertPasswordPolicy(dto.newPassword);

    const sameAsCurrent = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (sameAsCurrent) {
      throw new BadRequestException('New password must be different from the current password.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, updatedById: userId },
    });

    await this.revokeRefreshTokens(userId);

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'auth',
      action: 'password_change',
      recordType: 'user',
      recordId: userId,
      ipAddress,
      userAgent,
    });

    return { message: 'Password changed successfully.' };
  }

  private async clearExpiredLockIfNeeded(user: UserWithRoles): Promise<UserWithRoles> {
    if (!user.lockedUntil || user.lockedUntil > new Date()) {
      return user;
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      include: USER_AUTH_INCLUDE,
    });

    return updated as UserWithRoles;
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      message: 'Invalid email or password.',
      code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
    });
  }

  private async recordFailedLogin(
    user: UserWithRoles,
    maxFailedAttempts: number,
    lockDurationMinutes: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      const incremented = await tx.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: { increment: 1 },
        },
        select: {
          failedLoginAttempts: true,
          lockedUntil: true,
        },
      });

      if (incremented.failedLoginAttempts < maxFailedAttempts) {
        return incremented;
      }

      const lockedUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);
      return tx.user.update({
        where: { id: user.id },
        data: { lockedUntil },
        select: {
          failedLoginAttempts: true,
          lockedUntil: true,
        },
      });
    });

    const shouldLock = (result.failedLoginAttempts ?? 0) >= maxFailedAttempts;

    await this.auditService.log({
      companyId: user.companyId,
      actorUserId: user.id,
      module: 'auth',
      action: shouldLock ? 'login_locked' : 'login_failed',
      recordType: 'user',
      recordId: user.id,
      newValue: {
        failedLoginAttempts: result.failedLoginAttempts,
        lockedUntil: result.lockedUntil?.toISOString() ?? null,
      },
      ipAddress,
      userAgent,
    });
  }

  private async revokeRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date();
    const days = parseInt(expiresIn.replace('d', ''), 10) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return rawToken;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
