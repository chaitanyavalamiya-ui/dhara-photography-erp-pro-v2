import { BadRequestException } from '@nestjs/common';

export const EVENT_PROGRESS_STAGES = [
  'booking_confirmed',
  'team_assigned',
  'equipment_issued',
  'event_started',
  'photography_completed',
  'videography_completed',
  'editing',
  'album_pending',
  'album_completed',
  'delivery_pending',
  'delivered',
  'completed',
] as const;

export type EventProgressStage = (typeof EVENT_PROGRESS_STAGES)[number];

export const EVENT_PROGRESS_LABELS: Record<EventProgressStage, string> = {
  booking_confirmed: 'Booking Confirmed',
  team_assigned: 'Team Assigned',
  equipment_issued: 'Equipment Issued',
  event_started: 'Event Started',
  photography_completed: 'Photography Completed',
  videography_completed: 'Videography Completed',
  editing: 'Editing',
  album_pending: 'Album Pending',
  album_completed: 'Album Completed',
  delivery_pending: 'Delivery Pending',
  delivered: 'Delivered',
  completed: 'Completed',
};

export const EQUIPMENT_STATUSES = [
  'not_issued',
  'issued',
  'partially_returned',
  'returned',
  'missing',
  'damaged',
] as const;

export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  not_issued: 'Not Issued',
  issued: 'Issued',
  partially_returned: 'Partially Returned',
  returned: 'Returned',
  missing: 'Missing',
  damaged: 'Damaged',
};

export const STAFF_PAYMENT_STATUSES = ['pending', 'paid'] as const;

export const REMINDER_TYPES = ['birthday', 'anniversary', 'other'] as const;

export const REMINDER_STATUSES = ['active', 'completed'] as const;

export function assertEventProgressStage(stage: string): EventProgressStage {
  if (!EVENT_PROGRESS_STAGES.includes(stage as EventProgressStage)) {
    throw new BadRequestException(`Invalid event progress stage: ${stage}`);
  }
  return stage as EventProgressStage;
}

export function getEventProgressLabel(stage: string): string {
  return EVENT_PROGRESS_LABELS[stage as EventProgressStage] ?? stage;
}

export function getEquipmentStatusLabel(status: string): string {
  return EQUIPMENT_STATUS_LABELS[status as EquipmentStatus] ?? status;
}

export function computeEquipmentStatus(
  quantityIssued: number,
  quantityReturned: number,
  missingQuantity: number,
  damagedQuantity: number,
): EquipmentStatus {
  if (quantityIssued <= 0) return 'not_issued';
  if (missingQuantity > 0) return 'missing';
  if (damagedQuantity > 0 && quantityReturned >= quantityIssued) return 'damaged';
  if (quantityReturned <= 0) return 'issued';
  if (quantityReturned < quantityIssued) return 'partially_returned';
  return 'returned';
}
