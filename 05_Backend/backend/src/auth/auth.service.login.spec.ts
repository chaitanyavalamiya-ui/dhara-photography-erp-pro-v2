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

  const activeCompany = {
    id: 'company-1',
    isActive: true,
    archivedAt: null,
  };

  const loginDto = {
    companyCode: 'DHARA-PATAN',
    email: 'admin@example.com',
    password: 'CurrentPass1',
  };

  const mockPrisma = {
    company: {
      findFirst: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findFirst: jest.fn(),
      update: jest.fn(),
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
    mockPrisma.company.findFirst.mockResolvedValue(activeCompany);
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
    mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser });

    await expect(
      service.login({ ...loginDto, password: 'WrongPass1' }),
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
    mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, failedLoginAttempts: 4 });

    await expect(
      service.login({ ...loginDto, password: 'WrongPass1' }),
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
    mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, failedLoginAttempts: 3 });

    const result = await service.login(loginDto);

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
    mockPrisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() - 1000),
    });

    await service.login(loginDto);

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
    mockPrisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      lockedUntil: new Date(Date.now() + 60_000),
    });

    await expect(
      service.login({ ...loginDto, password: 'WrongPass1' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email or password.',
      }),
    });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns a lock message only after the correct password on a locked account', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      lockedUntil: new Date(Date.now() + 120_000),
    });

    try {
      await service.login(loginDto);
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
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ ...loginDto, email: 'missing@example.com' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: AUTH_ERROR_CODES.INVALID_CREDENTIALS }),
    });

    mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, isActive: false });
    await expect(service.login(loginDto)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email or password.',
      }),
    });
  });

  it('does not log secrets on failed login', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser });

    await expect(
      service.login({ ...loginDto, password: 'WrongPass1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const serialized = JSON.stringify(mockAuditService.log.mock.calls);
    expect(serialized).not.toContain('WrongPass1');
    expect(serialized).not.toContain(passwordHash);
    expect(serialized).not.toContain('access-token');
  });

  it('scopes login to company code plus email and succeeds for the matching tenant', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      userRoles: [
        {
          role: {
            permissions: [
              { isGranted: true, permission: { code: 'dashboard.read', isActive: true } },
            ],
          },
        },
      ],
    });

    const result = await service.login(loginDto);

    expect(mockPrisma.company.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: { equals: 'DHARA-PATAN', mode: 'insensitive' } },
      }),
    );
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId_normalizedEmail: {
            companyId: 'company-1',
            normalizedEmail: 'admin@example.com',
          },
        },
      }),
    );
    expect(result.user).toEqual(
      expect.objectContaining({
        id: 'user-1',
        companyId: 'company-1',
        permissions: ['dashboard.read'],
      }),
    );
    expect(mockJwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'user-1',
        companyId: 'company-1',
        permissions: ['dashboard.read'],
      }),
      expect.any(Object),
    );
  });

  it('does not allow the same email to log into a different company', async () => {
    mockPrisma.company.findFirst.mockResolvedValue({
      id: 'company-2',
      isActive: true,
      archivedAt: null,
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(service.login({ ...loginDto, companyCode: 'OTHER-STUDIO' })).rejects.toMatchObject({
      response: expect.objectContaining({ code: AUTH_ERROR_CODES.INVALID_CREDENTIALS }),
    });

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId_normalizedEmail: {
            companyId: 'company-2',
            normalizedEmail: 'admin@example.com',
          },
        },
      }),
    );
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockJwtService.signAsync).not.toHaveBeenCalled();
  });

  it('rejects an unknown or inactive company without looking up the user by email alone', async () => {
    mockPrisma.company.findFirst.mockResolvedValue(null);

    await expect(service.login({ ...loginDto, companyCode: 'MISSING' })).rejects.toMatchObject({
      response: expect.objectContaining({ code: AUTH_ERROR_CODES.INVALID_CREDENTIALS }),
    });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();

    mockPrisma.company.findFirst.mockResolvedValue({
      id: 'company-1',
      isActive: false,
      archivedAt: null,
    });
    await expect(service.login(loginDto)).rejects.toMatchObject({
      response: expect.objectContaining({ code: AUTH_ERROR_CODES.INVALID_CREDENTIALS }),
    });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('AuthService refresh revocation', () => {
  let service: AuthService;

  const mockPrisma = {
    company: { findFirst: jest.fn() },
    user: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    refreshToken: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const storedToken = {
    id: 'rt-1',
    userId: 'user-1',
    user: {
      id: 'user-1',
      companyId: 'company-1',
      email: 'admin@example.com',
      isActive: true,
      archivedAt: null,
      lockedUntil: null as Date | null,
      company: { id: 'company-1', isActive: true, archivedAt: null },
      userRoles: [
        {
          role: {
            permissions: [{ isGranted: true, permission: { code: 'users.read', isActive: true } }],
          },
        },
      ],
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.refreshToken.update.mockResolvedValue({ id: 'rt-1' });
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('new-access') } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, fallback?: unknown) => fallback),
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('issues a new access token from current DB company and permissions', async () => {
    mockPrisma.refreshToken.findFirst.mockResolvedValue(storedToken);

    const result = await service.refresh('raw-refresh');

    expect(result.accessToken).toBe('new-access');
    expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-1' },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('revokes refresh sessions when the user is deactivated', async () => {
    mockPrisma.refreshToken.findFirst.mockResolvedValue({
      ...storedToken,
      user: { ...storedToken.user, isActive: false },
    });

    await expect(service.refresh('raw-refresh')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('revokes refresh sessions when the company is deactivated', async () => {
    mockPrisma.refreshToken.findFirst.mockResolvedValue({
      ...storedToken,
      user: {
        ...storedToken.user,
        company: { id: 'company-1', isActive: false, archivedAt: null },
      },
    });

    await expect(service.refresh('raw-refresh')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('rejects a locked user without issuing new tokens', async () => {
    mockPrisma.refreshToken.findFirst.mockResolvedValue({
      ...storedToken,
      user: { ...storedToken.user, lockedUntil: new Date(Date.now() + 60_000) },
    });

    await expect(service.refresh('raw-refresh')).rejects.toMatchObject({
      response: expect.objectContaining({ code: AUTH_ERROR_CODES.ACCOUNT_LOCKED }),
    });
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });
});

