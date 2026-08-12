import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import {
  PermissionGroupDto,
  PermissionItemDto,
  RoleDetailDto,
  RoleSummaryDto,
} from './dto/role-response.dto';
import {
  formatPermissionAction,
  getPermissionGroup,
  LOCKED_ROLE_CODES,
  PERMISSION_GROUP_ORDER,
} from './utils/permission-groups';

type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: {
    permissions: {
      include: { permission: true };
    };
  };
}>;

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(companyId: string): Promise<RoleSummaryDto[]> {
    const roles = await this.prisma.role.findMany({
      where: { companyId, isActive: true, archivedAt: null },
      include: {
        permissions: {
          where: { isGranted: true },
          include: { permission: true },
        },
      },
      orderBy: { hierarchyRank: 'asc' },
    });

    return roles.map((role) => this.mapRoleSummary(role));
  }

  async findOne(companyId: string, id: string): Promise<RoleDetailDto> {
    const role = await this.getRoleWithPermissions(companyId, id);
    const allPermissions = await this.prisma.permission.findMany({
      where: { companyId, isActive: true, archivedAt: null },
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    const grantedCodes = new Set(
      role.permissions.filter((entry) => entry.isGranted).map((entry) => entry.permission.code),
    );

    const permissionGroups = this.buildPermissionGroups(allPermissions, grantedCodes);

    return {
      ...this.mapRoleSummary(role),
      permissionGroups,
      grantedPermissionCodes: Array.from(grantedCodes).sort(),
    };
  }

  async updatePermissions(
    companyId: string,
    actorUserId: string,
    roleId: string,
    dto: UpdateRolePermissionsDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RoleDetailDto> {
    const role = await this.getRoleWithPermissions(companyId, roleId);

    if (LOCKED_ROLE_CODES.includes(role.code as (typeof LOCKED_ROLE_CODES)[number])) {
      throw new ForbiddenException('The Owner role permissions cannot be modified.');
    }

    if (dto.permissionCodes.includes('roles.manage')) {
      const actorRoles = await this.prisma.userRole.findMany({
        where: { userId: actorUserId },
        include: { role: true },
      });
      const isOwner = actorRoles.some((entry) => entry.role.code === 'owner');
      if (!isOwner) {
        throw new ForbiddenException('Only the Owner can grant role management permission.');
      }
    }

    const permissions = await this.prisma.permission.findMany({
      where: { companyId, isActive: true, archivedAt: null },
    });

    const permissionByCode = new Map(permissions.map((permission) => [permission.code, permission]));
    const unknownCodes = dto.permissionCodes.filter((code) => !permissionByCode.has(code));
    if (unknownCodes.length > 0) {
      throw new BadRequestException(`Unknown permissions: ${unknownCodes.join(', ')}`);
    }

    const targetCodes = new Set(dto.permissionCodes);
    const previousCodes = role.permissions
      .filter((entry) => entry.isGranted)
      .map((entry) => entry.permission.code)
      .sort();

    await this.prisma.$transaction(async (tx) => {
      for (const permission of permissions) {
        const shouldGrant = targetCodes.has(permission.code);
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {
            isGranted: shouldGrant,
            updatedById: actorUserId,
          },
          create: {
            roleId: role.id,
            permissionId: permission.id,
            isGranted: shouldGrant,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
        });
      }
    });

    await this.auditService.log({
      companyId,
      actorUserId,
      module: 'roles',
      action: 'update_permissions',
      recordType: 'role',
      recordId: role.id,
      previousValue: { permissionCodes: previousCodes },
      newValue: { permissionCodes: [...targetCodes].sort() },
      ipAddress,
      userAgent,
    });

    return this.findOne(companyId, roleId);
  }

  private async getRoleWithPermissions(
    companyId: string,
    id: string,
  ): Promise<RoleWithPermissions> {
    const role = await this.prisma.role.findFirst({
      where: { id, companyId, isActive: true, archivedAt: null },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    return role;
  }

  private mapRoleSummary(role: RoleWithPermissions): RoleSummaryDto {
    const grantedCount = role.permissions.filter((entry) => entry.isGranted).length;

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      hierarchyRank: role.hierarchyRank,
      isSystem: role.isSystem,
      permissionCount: grantedCount,
      isEditable: !LOCKED_ROLE_CODES.includes(role.code as (typeof LOCKED_ROLE_CODES)[number]),
    };
  }

  private buildPermissionGroups(
    permissions: Array<{ id: string; code: string; module: string; action: string }>,
    grantedCodes: Set<string>,
  ): PermissionGroupDto[] {
    const grouped = new Map<string, PermissionItemDto[]>();

    for (const permission of permissions) {
      const group = getPermissionGroup(permission.module, permission.code);
      const item: PermissionItemDto = {
        id: permission.id,
        code: permission.code,
        module: permission.module,
        action: permission.action,
        group,
        label: formatPermissionAction(permission.action),
        isGranted: grantedCodes.has(permission.code),
      };

      const existing = grouped.get(group) ?? [];
      existing.push(item);
      grouped.set(group, existing);
    }

    const groups: PermissionGroupDto[] = [];

    for (const groupName of PERMISSION_GROUP_ORDER) {
      const items = grouped.get(groupName) ?? [];
      groups.push({
        group: groupName,
        permissions: items.sort((a, b) => a.code.localeCompare(b.code)),
      });
      grouped.delete(groupName);
    }

    for (const [group, items] of grouped.entries()) {
      groups.push({
        group,
        permissions: items.sort((a, b) => a.code.localeCompare(b.code)),
      });
    }

    return groups;
  }
}
