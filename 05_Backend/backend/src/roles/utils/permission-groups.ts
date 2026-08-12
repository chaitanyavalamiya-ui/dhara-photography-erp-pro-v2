export const PERMISSION_GROUP_ORDER = [
  'Dashboard',
  'Clients',
  'Bookings',
  'Calendar',
  'Gallery',
  'Albums',
  'Delivery',
  'Staff',
  'Users',
  'Invoices',
  'Accounts',
  'Expenses',
  'Reports',
  'Settings',
  'Packages',
  'Roles',
  'Audit',
] as const;

export type PermissionGroupName = (typeof PERMISSION_GROUP_ORDER)[number];

export function getPermissionGroup(module: string, code: string): PermissionGroupName {
  if (code.startsWith('expenses.')) return 'Expenses';
  if (code.startsWith('payments.') || code.startsWith('accounts.')) return 'Accounts';
  if (code.startsWith('roles.')) return 'Roles';
  if (module === 'settings') return 'Settings';

  const moduleMap: Record<string, PermissionGroupName> = {
    dashboard: 'Dashboard',
    clients: 'Clients',
    bookings: 'Bookings',
    gallery: 'Gallery',
    album: 'Albums',
    delivery: 'Delivery',
    staff: 'Staff',
    users: 'Users',
    invoices: 'Invoices',
    reports: 'Reports',
  };

  return moduleMap[module] ?? 'Settings';
}

export function formatPermissionAction(action: string): string {
  return action
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export const LOCKED_ROLE_CODES = ['owner'] as const;
