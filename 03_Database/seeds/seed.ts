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
  { code: 'payments.update', module: 'payments', action: 'update' },
  { code: 'accounts.read', module: 'accounts', action: 'read' },
  { code: 'expenses.read', module: 'expenses', action: 'read' },
  { code: 'expenses.create', module: 'expenses', action: 'create' },
  { code: 'expenses.update', module: 'expenses', action: 'update' },
  { code: 'gallery.read', module: 'gallery', action: 'read' },
  { code: 'gallery.create', module: 'gallery', action: 'create' },
  { code: 'gallery.update', module: 'gallery', action: 'update' },
  { code: 'gallery.archive', module: 'gallery', action: 'archive' },
  { code: 'album.read', module: 'album', action: 'read' },
  { code: 'album.create', module: 'album', action: 'create' },
  { code: 'album.update', module: 'album', action: 'update' },
  { code: 'album.archive', module: 'album', action: 'archive' },
  { code: 'delivery.read', module: 'delivery', action: 'read' },
  { code: 'delivery.create', module: 'delivery', action: 'create' },
  { code: 'delivery.update', module: 'delivery', action: 'update' },
  { code: 'reports.read', module: 'reports', action: 'read' },
  { code: 'staff.read', module: 'staff', action: 'read' },
  { code: 'staff.create', module: 'staff', action: 'create' },
  { code: 'staff.update', module: 'staff', action: 'update' },
  { code: 'staff.archive', module: 'staff', action: 'archive' },
  { code: 'staff.assign', module: 'staff', action: 'assign' },
  { code: 'equipment.read', module: 'equipment', action: 'read' },
  { code: 'equipment.write', module: 'equipment', action: 'write' },
  { code: 'equipment.issue', module: 'equipment', action: 'issue' },
  { code: 'equipment.return', module: 'equipment', action: 'return' },
  { code: 'equipment.export', module: 'equipment', action: 'export' },
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
    'payments.read', 'payments.create', 'payments.update',
    'accounts.read',
    'expenses.read', 'expenses.create', 'expenses.update',
    'gallery.read', 'gallery.create', 'gallery.update', 'gallery.archive',
    'album.read', 'album.create', 'album.update', 'album.archive',
    'delivery.read', 'delivery.create', 'delivery.update',
    'reports.read',
    'staff.read', 'staff.create', 'staff.update', 'staff.archive', 'staff.assign',
    'equipment.read', 'equipment.write', 'equipment.issue', 'equipment.return', 'equipment.export',
    'settings.read',
  ],
  staff: [
    'dashboard.read',
    'clients.read', 'clients.create',
    'bookings.read', 'bookings.create',
    'invoices.read',
    'payments.read', 'payments.create',
    'accounts.read',
    'expenses.read', 'expenses.create',
    'gallery.read', 'gallery.create',
    'album.read', 'album.create',
    'delivery.read', 'delivery.create',
    'reports.read',
    'staff.read', 'staff.create', 'staff.assign',
    'equipment.read', 'equipment.issue', 'equipment.return',
  ],
  viewer: [
    'dashboard.read',
    'clients.read',
    'bookings.read',
    'invoices.read',
    'payments.read',
    'accounts.read',
    'expenses.read',
    'gallery.read',
    'album.read',
    'delivery.read',
    'reports.read',
    'staff.read',
    'equipment.read',
    'settings.read',
  ],
};

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Database seeding is disabled when NODE_ENV=production. Use a controlled bootstrap process instead.',
    );
  }

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
    { category: 'booking_status', code: 'enquiry', label: 'Enquiry' },
    { category: 'booking_status', code: 'confirmed', label: 'Confirmed' },
    { category: 'booking_status', code: 'completed', label: 'Completed' },
    { category: 'booking_status', code: 'cancelled', label: 'Cancelled' },
    { category: 'payment_mode', code: 'cash', label: 'Cash' },
    { category: 'payment_mode', code: 'upi', label: 'UPI' },
    { category: 'payment_mode', code: 'bank_transfer', label: 'Bank Transfer' },
    { category: 'payment_mode', code: 'card', label: 'Card' },
    { category: 'payment_mode', code: 'cheque', label: 'Cheque' },
    { category: 'payment_mode', code: 'other', label: 'Other' },
    { category: 'expense_category', code: 'staff', label: 'Staff' },
    { category: 'expense_category', code: 'travel', label: 'Travel' },
    { category: 'expense_category', code: 'food', label: 'Food' },
    { category: 'expense_category', code: 'equipment', label: 'Equipment' },
    { category: 'expense_category', code: 'album_printing', label: 'Album Printing' },
    { category: 'expense_category', code: 'printing', label: 'Printing' },
    { category: 'expense_category', code: 'fuel', label: 'Fuel' },
    { category: 'expense_category', code: 'venue', label: 'Venue' },
    { category: 'expense_category', code: 'drone', label: 'Drone' },
    { category: 'expense_category', code: 'camera_rental', label: 'Camera/Equipment Rental' },
    { category: 'expense_category', code: 'editing', label: 'Editing' },
    { category: 'expense_category', code: 'electricity', label: 'Electricity' },
    { category: 'expense_category', code: 'internet', label: 'Internet' },
    { category: 'expense_category', code: 'marketing', label: 'Marketing' },
    { category: 'expense_category', code: 'office', label: 'Office' },
    { category: 'expense_category', code: 'other', label: 'Other' },
    { category: 'equipment_category', code: 'camera', label: 'Camera' },
    { category: 'equipment_category', code: 'lens', label: 'Lens' },
    { category: 'equipment_category', code: 'microphone', label: 'Microphone' },
    { category: 'equipment_category', code: 'light', label: 'Light' },
    { category: 'equipment_category', code: 'battery', label: 'Battery' },
    { category: 'equipment_category', code: 'memory_card', label: 'Memory Card' },
    { category: 'equipment_category', code: 'bag', label: 'Bag' },
    { category: 'equipment_category', code: 'gimbal', label: 'Gimbal' },
    { category: 'equipment_category', code: 'drone', label: 'Drone' },
    { category: 'equipment_category', code: 'led_display', label: 'LED / Display' },
    { category: 'equipment_category', code: 'cable_adapter', label: 'Cable / Adapter' },
    { category: 'equipment_category', code: 'tripod_stand', label: 'Tripod / Stand' },
    { category: 'equipment_category', code: 'audio', label: 'Audio' },
    { category: 'equipment_category', code: 'other', label: 'Other' },
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

  await prisma.equipment.updateMany({
    where: {
      companyId: company.id,
      code: 'LEN-001',
      name: 'Canon 50mm f/1.8',
      category: { not: 'Lens' },
    },
    data: { category: 'Lens' },
  });

  const serviceRateEntries = [
    { code: 'photography', name: 'Photography', category: 'service', defaultRate: 5000, unit: 'day', sortOrder: 1 },
    { code: 'videography', name: 'Videography', category: 'service', defaultRate: 5000, unit: 'day', sortOrder: 2 },
    { code: 'cinematic_video', name: 'Cinematic Video', category: 'service', defaultRate: 8000, unit: 'piece', sortOrder: 3 },
    { code: 'drone', name: 'Drone', category: 'service', defaultRate: 9000, unit: 'day', sortOrder: 4 },
    { code: 'poster', name: 'Poster', category: 'service', defaultRate: 1000, unit: 'piece', sortOrder: 5 },
    { code: 'led_wall_photo_frame', name: 'LED Wall / Photo Frame', category: 'service', defaultRate: 1000, unit: 'piece', sortOrder: 6 },
    { code: 'live_streaming', name: 'Live Streaming', category: 'service', defaultRate: 10000, unit: 'piece', sortOrder: 7 },
    { code: 'reel', name: 'Reel', category: 'service', defaultRate: 3000, unit: 'piece', sortOrder: 8 },
    { code: 'standard_album', name: 'Standard Album', category: 'album', defaultRate: 20000, unit: 'piece', sortOrder: 9 },
    { code: 'premium_album', name: 'Premium Album', category: 'album', defaultRate: 30000, unit: 'piece', sortOrder: 10 },
    { code: 'luxury_album', name: 'Luxury Album', category: 'album', defaultRate: 40000, unit: 'piece', sortOrder: 11 },
    { code: 'royal_album', name: 'Royal Album', category: 'album', defaultRate: 50000, unit: 'piece', sortOrder: 12 },
    { code: 'mini_album', name: 'Mini Album', category: 'album', defaultRate: 2500, unit: 'piece', sortOrder: 13 },
    { code: 'calendar', name: 'Calendar', category: 'service', defaultRate: 500, unit: 'piece', sortOrder: 14 },
    { code: 'soft_copy', name: 'Soft Copy', category: 'service', defaultRate: 1000, unit: 'piece', sortOrder: 15 },
  ];

  for (const rate of serviceRateEntries) {
    await prisma.serviceRate.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: rate.code,
        },
      },
      update: {
        name: rate.name,
        category: rate.category,
        defaultRate: rate.defaultRate,
        unit: rate.unit,
        sortOrder: rate.sortOrder,
      },
      create: {
        companyId: company.id,
        code: rate.code,
        name: rate.name,
        category: rate.category,
        defaultRate: rate.defaultRate,
        unit: rate.unit,
        sortOrder: rate.sortOrder,
      },
    });
  }

  const rateByCode: Record<string, string> = {};
  const seededRates = await prisma.serviceRate.findMany({
    where: { companyId: company.id },
    select: { id: true, code: true },
  });
  for (const rate of seededRates) {
    rateByCode[rate.code] = rate.id;
  }

  const packageEntries = [
    {
      code: 'wedding_basic',
      label: 'Basic Wedding Package',
      description: 'Photography + standard album for one-day wedding coverage.',
      defaultPrice: 45000,
      offerPrice: 42000,
      sortOrder: 1,
      items: [
        { serviceRateId: rateByCode.photography, quantity: 1, days: 1 },
        { serviceRateId: rateByCode.standard_album, quantity: 1, days: 1 },
      ],
    },
    {
      code: 'wedding_premium',
      label: 'Premium Wedding Package',
      description: 'Photography, videography, drone, and premium album.',
      defaultPrice: 95000,
      offerPrice: 89000,
      sortOrder: 2,
      items: [
        { serviceRateId: rateByCode.photography, quantity: 1, days: 1 },
        { serviceRateId: rateByCode.videography, quantity: 1, days: 1 },
        { serviceRateId: rateByCode.drone, quantity: 1, days: 1 },
        { serviceRateId: rateByCode.premium_album, quantity: 1, days: 1 },
      ],
    },
  ];

  for (const pkg of packageEntries) {
    if (pkg.items.some((item) => !item.serviceRateId)) {
      continue;
    }

    await prisma.masterData.upsert({
      where: {
        companyId_category_code: {
          companyId: company.id,
          category: 'package',
          code: pkg.code,
        },
      },
      update: {
        label: pkg.label,
        sortOrder: pkg.sortOrder,
        metadata: {
          description: pkg.description,
          defaultPrice: pkg.defaultPrice,
          offerPrice: pkg.offerPrice,
          items: pkg.items,
        },
      },
      create: {
        companyId: company.id,
        category: 'package',
        code: pkg.code,
        label: pkg.label,
        sortOrder: pkg.sortOrder,
        metadata: {
          description: pkg.description,
          defaultPrice: pkg.defaultPrice,
          offerPrice: pkg.offerPrice,
          items: pkg.items,
        },
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
