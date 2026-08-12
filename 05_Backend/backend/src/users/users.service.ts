import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertPasswordPolicy } from '../common/utils/password-policy.util';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import {
  PaginatedUsersResponseDto,
  RoleOptionDto,
  UserDetailResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';

type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: { role: true };
    };
  };
}>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(companyId: string, query: ListUsersQueryDto): Promise<PaginatedUsersResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const where = this.buildWhereClause(companyId, query.search, query.status);
    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { userRoles: { include: { role: true } } },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((user) => this.mapUser(user)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(companyId: string, id: string): Promise<UserDetailResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId, archivedAt: null },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.mapUser(user);
  }

  async getRoles(companyId: string): Promise<RoleOptionDto[]> {
    const roles = await this.prisma.role.findMany({
      where: { companyId, isActive: true, archivedAt: null },
      orderBy: { hierarchyRank: 'asc' },
    });

    return roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      hierarchyRank: role.hierarchyRank,
    }));
  }

  async create(
    companyId: string,
    actorUserId: string,
    dto: CreateUserDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserResponseDto> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findFirst({
      where: { companyId, normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    await this.validateRoleIds(companyId, dto.roleIds);
    assertPasswordPolicy(dto.password);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const primaryRoleId = dto.roleIds[0];

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          companyId,
          fullName: dto.fullName.trim(),
          email: dto.email.trim(),
          normalizedEmail,
          passwordHash,
          defaultRoleId: primaryRoleId,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
      });

      await tx.userRole.createMany({
        data: dto.roleIds.map((roleId, index) => ({
          userId: created.id,
          roleId,
          isPrimary: index === 0,
          createdById: actorUserId,
          updatedById: actorUserId,
        })),
      });

      return tx.user.findUniqueOrThrow({
        where: { id: created.id },
        include: { userRoles: { include: { role: true } } },
      });
    });

    await this.auditService.log({
      companyId,
      actorUserId,
      module: 'users',
      action: 'create',
      recordType: 'user',
      recordId: user.id,
      newValue: { email: user.email, fullName: user.fullName, roleIds: dto.roleIds },
      ipAddress,
      userAgent,
    });

    return this.mapUser(user);
  }

  async update(
    companyId: string,
    actorUserId: string,
    id: string,
    dto: UpdateUserDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findFirst({
      where: { id, companyId, archivedAt: null },
      include: { userRoles: { include: { role: true } } },
    });

    if (!existing) {
      throw new NotFoundException('User not found.');
    }

    if (id === actorUserId && dto.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own account.');
    }

    let normalizedEmail = existing.normalizedEmail;
    if (dto.email) {
      normalizedEmail = dto.email.toLowerCase().trim();
      const duplicate = await this.prisma.user.findFirst({
        where: { companyId, normalizedEmail, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictException('A user with this email already exists.');
      }
    }

    if (dto.roleIds) {
      await this.validateRoleIds(companyId, dto.roleIds);
    }

    if (dto.password) {
      assertPasswordPolicy(dto.password);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
          ...(dto.email !== undefined
            ? { email: dto.email.trim(), normalizedEmail }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.password ? { passwordHash: await bcrypt.hash(dto.password, 12) } : {}),
          ...(dto.roleIds ? { defaultRoleId: dto.roleIds[0] } : {}),
          updatedById: actorUserId,
        },
      });

      if (dto.roleIds) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({
          data: dto.roleIds.map((roleId, index) => ({
            userId: id,
            roleId,
            isPrimary: index === 0,
            createdById: actorUserId,
            updatedById: actorUserId,
          })),
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { userRoles: { include: { role: true } } },
      });
    });

    if (dto.password) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.auditService.log({
        companyId,
        actorUserId,
        module: 'users',
        action: 'password_reset',
        recordType: 'user',
        recordId: id,
        newValue: { email: updated.email, fullName: updated.fullName },
        ipAddress,
        userAgent,
      });
    }

    await this.auditService.log({
      companyId,
      actorUserId,
      module: 'users',
      action: 'update',
      recordType: 'user',
      recordId: updated.id,
      previousValue: {
        email: existing.email,
        fullName: existing.fullName,
        isActive: existing.isActive,
      },
      newValue: {
        email: updated.email,
        fullName: updated.fullName,
        isActive: updated.isActive,
      },
      ipAddress,
      userAgent,
    });

    return this.mapUser(updated);
  }

  async archive(
    companyId: string,
    actorUserId: string,
    id: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    if (id === actorUserId) {
      throw new BadRequestException('You cannot archive your own account.');
    }

    const existing = await this.prisma.user.findFirst({
      where: { id, companyId, archivedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('User not found.');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
        archivedById: actorUserId,
        updatedById: actorUserId,
      },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });

    await this.auditService.log({
      companyId,
      actorUserId,
      module: 'users',
      action: 'archive',
      recordType: 'user',
      recordId: id,
      previousValue: { email: existing.email, fullName: existing.fullName },
      ipAddress,
      userAgent,
    });

    return { message: 'User archived successfully.' };
  }

  private async validateRoleIds(companyId: string, roleIds: string[]): Promise<void> {
    const roles = await this.prisma.role.findMany({
      where: { companyId, id: { in: roleIds }, isActive: true, archivedAt: null },
    });

    if (roles.length !== roleIds.length) {
      throw new BadRequestException('One or more selected roles are invalid.');
    }
  }

  private buildWhereClause(
    companyId: string,
    search?: string,
    status: 'active' | 'inactive' | 'all' = 'active',
  ): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {
      companyId,
      archivedAt: null,
    };

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const term = search?.trim();
    if (term) {
      where.OR = [
        { fullName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildOrderBy(
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): Prisma.UserOrderByWithRelationInput {
    const direction = sortOrder;
    switch (sortBy) {
      case 'fullName':
        return { fullName: direction };
      case 'email':
        return { email: direction };
      case 'lastLoginAt':
        return { lastLoginAt: direction };
      default:
        return { createdAt: direction };
    }
  }

  private mapUser(user: UserWithRoles): UserResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      isActive: user.isActive,
      roles: user.userRoles.map((userRole) => ({
        id: userRole.role.id,
        code: userRole.role.code,
        name: userRole.role.name,
        isPrimary: userRole.isPrimary,
      })),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
