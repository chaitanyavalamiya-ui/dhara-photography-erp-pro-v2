import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { AUTH_ERROR_CODES } from '../auth-error.codes';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  const payload: JwtPayload = {
    sub: 'user-1',
    email: 'admin@example.com',
    companyId: 'company-1',
    permissions: ['users.read'],
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects inactive users', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      isActive: false,
      archivedAt: null,
      lockedUntil: null,
    });

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
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      isActive: true,
      archivedAt: new Date(),
      lockedUntil: null,
    });

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

  it('rejects locked users', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      isActive: true,
      archivedAt: null,
      lockedUntil: new Date(Date.now() + 60_000),
    });

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

  it('returns the payload for an active unlocked user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      isActive: true,
      archivedAt: null,
      lockedUntil: null,
    });

    await expect(strategy.validate(payload)).resolves.toEqual(payload);
  });
});
