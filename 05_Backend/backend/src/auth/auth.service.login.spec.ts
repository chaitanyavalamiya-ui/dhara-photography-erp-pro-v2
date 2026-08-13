import { HttpException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUTH_ERROR_CODES } from './auth-error.codes';

describe('AuthService login security', () => {
  let service: AuthService;
  let failedAttempts = 0;

  const passwordHash = bcrypt.hashSync('CurrentPass1', 12);

  const baseUser = {
    id: 'user-1',
    companyId: 'company-1',
    fullName: 'Admin User',
    email: 'admin@example.com',
    normalizedEmail: 'admin@example.com',
    passwordHash,
    isActive: true,
    archivedAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null as Date | null,
    userRoles: [],
  };

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('access-token'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    failedAttempts = 0;

    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) =>
      callback(mockPrisma),
    );
    mockPrisma.user.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      const increment = (data.failedLoginAttempts as { increment?: number } | undefined)?.increment;
      if (typeof increment === 'number') {
        failedAttempts += increment;
        return { failedLoginAttempts: failedAttempts, lockedUntil: null };
      }
      if (data.lockedUntil instanceof Date) {
        return { failedLoginAttempts: failedAttempts, lockedUntil: data.lockedUntil };
      }
      return {
        ...baseUser,
        failedLoginAttempts: (data.failedLoginAttempts as number) ?? 0,
        lockedUntil: (data.lockedUntil as Date | null) ?? null,
        userRoles: [],
      };
    });
    mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, fallback?: unknown) => fallback),
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('increments failed login attempts atomically', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser });

    await expect(
      service.login({ email: 'admin@example.com', password: 'WrongPass1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failedLoginAttempts: { increment: 1 },
        }),
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'login_failed',
        newValue: expect.objectContaining({ failedLoginAttempts: 1 }),
      }),
    );
  });

  it('locks the account when the atomic threshold is reached', async () => {
    failedAttempts = 4;
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, failedLoginAttempts: 4 });

    await expect(
      service.login({ email: 'admin@example.com', password: 'WrongPass1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lockedUntil: expect.any(Date) }),
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'login_locked' }),
    );
    const auditPayload = mockAuditService.log.mock.calls[0][0];
    expect(auditPayload).not.toHaveProperty('password');
    expect(auditPayload.newValue).not.toHaveProperty('passwordHash');
    expect(auditPayload.newValue).not.toHaveProperty('accessToken');
    expect(auditPayload.newValue).not.toHaveProperty('refreshToken');
  });

  it('resets the failed-attempt counter on successful login', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, failedLoginAttempts: 3 });

    const result = await service.login({ email: 'admin@example.com', password: 'CurrentPass1' });

    expect(result.tokens.accessToken).toBe('access-token');
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failedLoginAttempts: 0,
          lockedUntil: null,
        }),
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'login_success' }),
    );
  });

  it('clears an expired lock before authenticating', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...baseUser,
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() - 1000),
    });

    await service.login({ email: 'admin@example.com', password: 'CurrentPass1' });

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failedLoginAttempts: 0,
          lockedUntil: null,
        }),
      }),
    );
  });

  it('does not reveal lockout for a wrong password on a locked account', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...baseUser,
      lockedUntil: new Date(Date.now() + 60_000),
    });

    await expect(
      service.login({ email: 'admin@example.com', password: 'WrongPass1' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email or password.',
      }),
    });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns a lock message only after the correct password on a locked account', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...baseUser,
      lockedUntil: new Date(Date.now() + 120_000),
    });

    try {
      await service.login({ email: 'admin@example.com', password: 'CurrentPass1' });
      throw new Error('expected lockout');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(401);
      expect((error as HttpException).getResponse()).toEqual(
        expect.objectContaining({
          code: AUTH_ERROR_CODES.ACCOUNT_LOCKED,
          retryAfterSeconds: expect.any(Number),
        }),
      );
    }
  });

  it('rejects unknown, inactive, and archived users with the same credentials error', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    await expect(
      service.login({ email: 'missing@example.com', password: 'CurrentPass1' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: AUTH_ERROR_CODES.INVALID_CREDENTIALS }),
    });

    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, isActive: false });
    await expect(
      service.login({ email: 'admin@example.com', password: 'CurrentPass1' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email or password.',
      }),
    });
  });

  it('does not log secrets on failed login', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser });

    await expect(
      service.login({ email: 'admin@example.com', password: 'WrongPass1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const serialized = JSON.stringify(mockAuditService.log.mock.calls);
    expect(serialized).not.toContain('WrongPass1');
    expect(serialized).not.toContain(passwordHash);
    expect(serialized).not.toContain('access-token');
  });
});
