export type RolePermissionGrant = {
  isGranted: boolean;
  permission: { code: string; isActive: boolean };
};

export function extractPermissions(
  userRoles: Array<{ role: { permissions: RolePermissionGrant[] } }>,
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

export function isCompanyAccessActive(company: {
  isActive: boolean;
  archivedAt: Date | null;
} | null | undefined): boolean {
  return Boolean(company && company.isActive && !company.archivedAt);
}

export function isUserAccessActive(user: {
  isActive: boolean;
  archivedAt: Date | null;
} | null | undefined): boolean {
  return Boolean(user && user.isActive && !user.archivedAt);
}
