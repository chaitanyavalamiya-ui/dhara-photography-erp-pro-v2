import { BadRequestException } from '@nestjs/common';

export const STAFF_ROLES = [
  'photographer',
  'videographer',
  'cinematographer',
  'editor',
  'drone_operator',
  'helper',
  'album_designer',
  'assistant',
  'driver',
  'other',
] as const;

export type StaffRoleCode = (typeof STAFF_ROLES)[number];

export const STAFF_ROLE_LABELS: Record<StaffRoleCode, string> = {
  photographer: 'Photographer',
  videographer: 'Videographer',
  cinematographer: 'Cinematographer',
  editor: 'Editor',
  drone_operator: 'Drone Operator',
  helper: 'Helper',
  album_designer: 'Album Designer',
  assistant: 'Assistant',
  driver: 'Driver',
  other: 'Other',
};

export const PAYMENT_TYPES = ['fixed', 'per_event', 'per_day', 'hourly'] as const;

export type PaymentTypeCode = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_TYPE_LABELS: Record<PaymentTypeCode, string> = {
  fixed: 'Fixed Salary',
  per_event: 'Per Event',
  per_day: 'Per Day',
  hourly: 'Hourly',
};

export function assertStaffRole(role: string): StaffRoleCode {
  if (!STAFF_ROLES.includes(role as StaffRoleCode)) {
    throw new BadRequestException(`Invalid staff role: ${role}`);
  }

  return role as StaffRoleCode;
}

export function assertPaymentType(paymentType: string): PaymentTypeCode {
  if (!PAYMENT_TYPES.includes(paymentType as PaymentTypeCode)) {
    throw new BadRequestException(`Invalid payment type: ${paymentType}`);
  }

  return paymentType as PaymentTypeCode;
}

export function getStaffRoleLabel(role: string): string {
  return STAFF_ROLE_LABELS[role as StaffRoleCode] ?? role;
}

export function getPaymentTypeLabel(paymentType: string): string {
  return PAYMENT_TYPE_LABELS[paymentType as PaymentTypeCode] ?? paymentType;
}
