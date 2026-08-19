import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AUTH_ERROR_CODES } from '../auth-error.codes';
import {
  extractPermissions,
  isCompanyAccessActive,
  isUserAccessActive,
} from '../auth-permissions';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        company: {
          select: {
            id: true,
            isActive: true,
            archivedAt: true,
          },
        },
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

    if (!user || !isUserAccessActive(user) || !isCompanyAccessActive(user.company)) {
      throw new UnauthorizedException({
        message: 'User account is not active.',
        code: AUTH_ERROR_CODES.ACCOUNT_INACTIVE,
      });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException({
        message: 'Account temporarily locked.',
        code: AUTH_ERROR_CODES.ACCOUNT_LOCKED,
      });
    }

    return {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      permissions: extractPermissions(user.userRoles),
    };
  }
}
