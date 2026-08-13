import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('UsersService password reset', () => {
  let service: UsersService;

  const existingUser = {
    id: 'user-2',
    companyId: 'company-1',
    fullName: 'Studio Staff',
    email: 'staff@example.com',
    normalizedEmail: 'staff@example.com',
    passwordHash: bcrypt.hashSync('OldSecure1', 12),
    isActive: true,
    archivedAt: null,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    failedLoginAttempts: 0,
    lockedUntil: null,
    userRoles: [{ role: { id: 'role-1', code: 'staff', name: 'Staff' }, isPrimary: true }],
  };

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    userRole: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) =>
      callback(mockPrisma),
    );
    mockPrisma.user.update.mockResolvedValue(existingUser);
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue(existingUser);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('logs password_reset audit without sensitive password data', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(existingUser);
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    await service.update('company-1', 'admin-1', 'user-2', {
      password: 'ResetPass1',
    });

    const passwordResetAudit = mockAuditService.log.mock.calls.find(
      ([payload]) => payload.action === 'password_reset',
    );

    expect(passwordResetAudit).toBeDefined();
    expect(passwordResetAudit?.[0]).toEqual(
      expect.objectContaining({
        module: 'users',
        action: 'password_reset',
        recordId: 'user-2',
      }),
    );
    expect(passwordResetAudit?.[0].newValue).toEqual({
      email: existingUser.email,
      fullName: existingUser.fullName,
    });
    expect(passwordResetAudit?.[0].newValue).not.toHaveProperty('password');
    expect(passwordResetAudit?.[0].newValue).not.toHaveProperty('passwordHash');
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalled();
  });

  it('unlocks a locked account, resets attempts, and audits without credentials', async () => {
    const lockedUser = {
      ...existingUser,
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 60_000),
    };
    mockPrisma.user.findFirst.mockResolvedValue(lockedUser);
    mockPrisma.user.update.mockResolvedValue({
      ...lockedUser,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    const result = await service.unlock('company-1', 'admin-1', 'user-2');

    expect(result.failedLoginAttempts).toBe(0);
    expect(result.lockedUntil).toBeNull();
    expect(result.isLocked).toBe(false);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failedLoginAttempts: 0,
          lockedUntil: null,
        }),
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'users',
        action: 'account_unlock',
        recordId: 'user-2',
        newValue: { failedLoginAttempts: 0, lockedUntil: null },
      }),
    );
    const serialized = JSON.stringify(mockAuditService.log.mock.calls);
    expect(serialized).not.toContain('password');
    expect(serialized).not.toMatch(/passwordHash/);
  });

  it('rejects admin password reset that fails policy validation', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(existingUser);

    await expect(
      service.update('company-1', 'admin-1', 'user-2', {
        password: 'weak',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(mockAuditService.log).not.toHaveBeenCalled();
  });
});
