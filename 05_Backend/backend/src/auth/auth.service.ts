import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

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

    const user = await this.prisma.user.findFirst({
      where: {
        normalizedEmail,
        isActive: true,
        archivedAt: null,
      },
      include: {
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const permissions = this.extractPermissions(user.userRoles);
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

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.auditService.log({
      companyId: user.companyId,
      actorUserId: user.id,
      module: 'auth',
      action: 'login',
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
          },
        },
      },
    });

    if (!stored || !stored.user.isActive || stored.user.archivedAt) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const permissions = this.extractPermissions(stored.user.userRoles);
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
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

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
      },
    });

    if (!user || !user.isActive || user.archivedAt) {
      throw new ForbiddenException('User account is not active.');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      companyId: user.companyId,
      permissions: this.extractPermissions(user.userRoles),
    };
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

  private extractPermissions(
    userRoles: Array<{
      role: {
        permissions: Array<{
          isGranted: boolean;
          permission: { code: string; isActive: boolean };
        }>;
      };
    }>,
  ): string[] {
    const permissionSet = new Set<string>();

    for (const userRole of userRoles) {
      for (const rolePerm of userRole.role.permissions) {
        if (rolePerm.isGranted && rolePerm.permission.isActive) {
          permissionSet.add(rolePerm.permission.code);
        }
      }
    }

    return Array.from(permissionSet).sort();
  }
}
