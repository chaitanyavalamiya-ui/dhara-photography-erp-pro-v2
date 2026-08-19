import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { AUTH_ERROR_CODES } from '../auth-error.codes';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  const payload: JwtPayload = {
    sub: 'user-1',
    email: 'stale@example.com',
    companyId: 'stale-company',
    permissions: ['stale.permission'],
  };

  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const strategy = new JwtStrategy(
    {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService,
    prisma as unknown as PrismaService,
  );

  function activeUser(overrides: Record<string, unknown> = {}) {
    return {
      id: 'user-1',
      email: 'admin@example.com',
      companyId: 'company-1',
      isActive: true,
      archivedAt: null,
      lockedUntil: null,
      company: {
        id: 'company-1',
        isActive: true,
        archivedAt: null,
      },
      userRoles: [
        {
          role: {
            permissions: [
              {
                isGranted: true,
                permission: { code: 'users.read', isActive: true },
              },
              {
                isGranted: true,
                permission: { code: 'users.update', isActive: false },
              },
            ],
          },
        },
      ],
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects inactive users', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser({ isActive: false }));

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
    try {
      await strategy.validate(payload);
    } catch (error) {
      expect((error as UnauthorizedException).getResponse()).toEqual(
        expect.objectContaining({
          code: AUTH_ERROR_CODES.ACCOUNT_INACTIVE,
        }),
      );
    }
  });

  it('rejects archived users', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser({ archivedAt: new Date() }));

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
    try {
      await strategy.validate(payload);
    } catch (error) {
      expect((error as UnauthorizedException).getResponse()).toEqual(
        expect.objectContaining({
          code: AUTH_ERROR_CODES.ACCOUNT_INACTIVE,
        }),
      );
    }
  });

  it('rejects users in a deactivated company', async () => {
    prisma.user.findUnique.mockResolvedValue(
      activeUser({
        company: { id: 'company-1', isActive: false, archivedAt: null },
      }),
    );

    await expect(strategy.validate(payload)).rejects.toMatchObject({
      response: expect.objectContaining({ code: AUTH_ERROR_CODES.ACCOUNT_INACTIVE }),
    });
  });

  it('rejects locked users', async () => {
    prisma.user.findUnique.mockResolvedValue(
      activeUser({ lockedUntil: new Date(Date.now() + 60_000) }),
    );

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
    try {
      await strategy.validate(payload);
    } catch (error) {
      expect((error as UnauthorizedException).getResponse()).toEqual(
        expect.objectContaining({
          code: AUTH_ERROR_CODES.ACCOUNT_LOCKED,
        }),
      );
    }
  });

  it('returns current DB company and permissions instead of the JWT payload', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser());

    await expect(strategy.validate(payload)).resolves.toEqual({
      sub: 'user-1',
      email: 'admin@example.com',
      companyId: 'company-1',
      permissions: ['users.read'],
    });
  });
});
