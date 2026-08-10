export const STAFF_ROLES = [
  { code: 'photographer', label: 'Photographer' },
  { code: 'videographer', label: 'Videographer' },
  { code: 'cinematographer', label: 'Cinematographer' },
  { code: 'editor', label: 'Editor' },
  { code: 'drone_operator', label: 'Drone Operator' },
  { code: 'helper', label: 'Helper' },
  { code: 'album_designer', label: 'Album Designer' },
  { code: 'assistant', label: 'Assistant' },
  { code: 'driver', label: 'Driver' },
  { code: 'other', label: 'Other' },
] as const;

export const PAYMENT_TYPES = [
  { code: 'fixed', label: 'Fixed Salary' },
  { code: 'per_event', label: 'Per Event' },
  { code: 'per_day', label: 'Per Day' },
  { code: 'hourly', label: 'Hourly' },
] as const;

export function getStaffRoleLabel(code: string): string {
  return STAFF_ROLES.find((role) => role.code === code)?.label ?? code;
}

export function getPaymentTypeLabel(code: string): string {
  return PAYMENT_TYPES.find((type) => type.code === code)?.label ?? code;
}

export function formatStaffPayment(staff: {
  paymentType: string;
  paymentTypeLabel: string;
  defaultRate: number;
}): string {
  if (staff.paymentType === 'fixed') {
    return `${staff.paymentTypeLabel} · ${formatCurrency(staff.defaultRate)}`;
  }

  if (staff.defaultRate > 0) {
    return `${staff.paymentTypeLabel} · ${formatCurrency(staff.defaultRate)}`;
  }

  return staff.paymentTypeLabel;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
