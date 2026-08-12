import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('AuthService password management', () => {
  let service: AuthService;

  const passwordHash = bcrypt.hashSync('CurrentPass1', 12);

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
    fullName: 'Admin User',
    email: 'admin@example.com',
    normalizedEmail: 'admin@example.com',
    passwordHash,
    isActive: true,
    archivedAt: null,
    userRoles: [],
  };

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn(), getOrThrow: jest.fn() } },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('changePassword', () => {
    it('changes password successfully and revokes refresh sessions', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.changePassword('user-1', 'company-1', {
        currentPassword: 'CurrentPass1',
        newPassword: 'NewSecure1',
      });

      expect(result.message).toBe('Password changed successfully.');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          passwordHash: expect.any(String),
          updatedById: 'user-1',
        }),
      });
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'auth',
          action: 'password_change',
          recordId: 'user-1',
        }),
      );

      const auditPayload = mockAuditService.log.mock.calls[0][0];
      expect(auditPayload.newValue).toBeUndefined();
      expect(auditPayload.previousValue).toBeUndefined();
      expect(auditPayload).not.toHaveProperty('password');
      expect(auditPayload).not.toHaveProperty('passwordHash');
    });

    it('rejects an incorrect current password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.changePassword('user-1', 'company-1', {
          currentPassword: 'WrongPass1',
          newPassword: 'NewSecure1',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });

    it('rejects a new password that fails policy validation', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.changePassword('user-1', 'company-1', {
          currentPassword: 'CurrentPass1',
          newPassword: 'short',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects inactive users', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.changePassword('user-1', 'company-1', {
          currentPassword: 'CurrentPass1',
          newPassword: 'NewSecure1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
