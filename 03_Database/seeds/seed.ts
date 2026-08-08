import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const ROLES = [
  { code: 'owner', name: 'Owner', hierarchyRank: 1 },
  { code: 'admin', name: 'Admin', hierarchyRank: 2 },
  { code: 'manager', name: 'Manager', hierarchyRank: 3 },
  { code: 'staff', name: 'Staff', hierarchyRank: 4 },
  { code: 'viewer', name: 'Viewer', hierarchyRank: 5 },
] as const;

const PERMISSIONS = [
  { code: 'dashboard.read', module: 'dashboard', action: 'read' },
  { code: 'clients.read', module: 'clients', action: 'read' },
  { code: 'clients.create', module: 'clients', action: 'create' },
  { code: 'clients.update', module: 'clients', action: 'update' },
  { code: 'clients.archive', module: 'clients', action: 'archive' },
  { code: 'bookings.read', module: 'bookings', action: 'read' },
  { code: 'bookings.create', module: 'bookings', action: 'create' },
  { code: 'bookings.update', module: 'bookings', action: 'update' },
  { code: 'bookings.archive', module: 'bookings', action: 'archive' },
  { code: 'invoices.read', module: 'invoices', action: 'read' },
  { code: 'invoices.create', module: 'invoices', action: 'create' },
  { code: 'invoices.update', module: 'invoices', action: 'update' },
  { code: 'payments.read', module: 'payments', action: 'read' },
  { code: 'payments.create', module: 'payments', action: 'create' },
  { code: 'settings.read', module: 'settings', action: 'read' },
  { code: 'settings.update', module: 'settings', action: 'update' },
  { code: 'users.read', module: 'users', action: 'read' },
  { code: 'users.manage', module: 'users', action: 'manage' },
  { code: 'roles.read', module: 'roles', action: 'read' },
  { code: 'roles.manage', module: 'roles', action: 'manage' },
] as const;

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  owner: PERMISSIONS.map((p) => p.code),
  admin: PERMISSIONS.filter((p) => !p.code.startsWith('roles.manage')).map((p) => p.code),
  manager: [
    'dashboard.read',
    'clients.read', 'clients.create', 'clients.update',
    'bookings.read', 'bookings.create', 'bookings.update',
    'invoices.read', 'invoices.create', 'invoices.update',
    'payments.read', 'payments.create',
    'settings.read',
  ],
  staff: [
    'dashboard.read',
    'clients.read', 'clients.create',
    'bookings.read', 'bookings.create',
    'invoices.read',
    'payments.read', 'payments.create',
  ],
  viewer: [
    'dashboard.read',
    'clients.read',
    'bookings.read',
    'invoices.read',
    'payments.read',
    'settings.read',
  ],
};

async function main(): Promise<void> {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env for development seed.',
    );
  }

  console.log('Seeding Dhara Photography ERP Pro V2 foundation data...');

  const company = await prisma.company.upsert({
    where: { code: 'DHARA-PATAN' },
    update: {},
    create: {
      name: 'Dhara Photography Patan',
      code: 'DHARA-PATAN',
    },
  });

  const branch = await prisma.companyBranch.upsert({
    where: { companyId_code: { companyId: company.id, code: 'PATAN' } },
    update: {},
    create: {
      companyId: company.id,
      name: 'Patan Main Studio',
      code: 'PATAN',
    },
  });

  const permissionRecords: Record<string, string> = {};
  for (const perm of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { companyId_code: { companyId: company.id, code: perm.code } },
      update: {},
      create: {
        companyId: company.id,
        code: perm.code,
        module: perm.module,
        action: perm.action,
        description: `${perm.module} ${perm.action}`,
      },
    });
    permissionRecords[perm.code] = record.id;
  }

  const roleRecords: Record<string, string> = {};
  for (const role of ROLES) {
    const record = await prisma.role.upsert({
      where: { companyId_code: { companyId: company.id, code: role.code } },
      update: {},
      create: {
        companyId: company.id,
        code: role.code,
        name: role.name,
        hierarchyRank: role.hierarchyRank,
        isSystem: true,
      },
    });
    roleRecords[role.code] = record.id;
  }

  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSION_MAP)) {
    const roleId = roleRecords[roleCode];
    for (const permCode of permCodes) {
      const permissionId = permissionRecords[permCode];
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId, scope: 'ALL' },
      });
    }
  }

  const masterDataEntries = [
    { category: 'client_status', code: 'active', label: 'Active' },
    { category: 'client_status', code: 'inactive', label: 'Inactive' },
    { category: 'booking_status', code: 'draft', label: 'Draft' },
    { category: 'booking_status', code: 'confirmed', label: 'Confirmed' },
    { category: 'booking_status', code: 'completed', label: 'Completed' },
    { category: 'payment_mode', code: 'cash', label: 'Cash' },
    { category: 'payment_mode', code: 'upi', label: 'UPI' },
    { category: 'payment_mode', code: 'bank_transfer', label: 'Bank Transfer' },
  ];

  for (const entry of masterDataEntries) {
    await prisma.masterData.upsert({
      where: {
        companyId_category_code: {
          companyId: company.id,
          category: entry.category,
          code: entry.code,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        category: entry.category,
        code: entry.code,
        label: entry.label,
      },
    });
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const normalizedEmail = adminEmail.toLowerCase().trim();

  const adminUser = await prisma.user.upsert({
    where: { companyId_normalizedEmail: { companyId: company.id, normalizedEmail } },
    update: { passwordHash },
    create: {
      companyId: company.id,
      defaultRoleId: roleRecords.owner,
      fullName: 'Development Admin',
      email: adminEmail,
      normalizedEmail,
      passwordHash,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: roleRecords.owner } },
    update: { isPrimary: true },
    create: {
      userId: adminUser.id,
      roleId: roleRecords.owner,
      isPrimary: true,
    },
  });

  console.log('Seed completed successfully.');
  console.log(`  Company : ${company.name} (${company.code})`);
  console.log(`  Branch  : ${branch.name} (${branch.code})`);
  console.log(`  Admin   : ${adminEmail}`);
  console.log('  Password: (value of SEED_ADMIN_PASSWORD in your .env file)');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
