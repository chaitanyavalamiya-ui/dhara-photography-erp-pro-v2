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
  'repair',
] as const;

export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  not_issued: 'Not Issued',
  issued: 'Issued',
  partially_returned: 'Partially Returned',
  returned: 'Returned',
  missing: 'Missing',
  damaged: 'Damaged',
  repair: 'Repair',
};

export function parseReturnCondition(conditionReturn?: string | null): {
  damagedQuantity: number;
  repairQuantity: number;
} {
  if (!conditionReturn) {
    return { damagedQuantity: 0, repairQuantity: 0 };
  }

  let damagedQuantity = 0;
  let repairQuantity = 0;

  for (const part of conditionReturn.split(';')) {
    const [key, value] = part.split(':');
    const qty = Number(value);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    if (key === 'damaged') damagedQuantity = qty;
    if (key === 'repair') repairQuantity = qty;
  }

  if (damagedQuantity === 0 && repairQuantity === 0) {
    if (conditionReturn.toLowerCase().includes('repair')) {
      repairQuantity = 1;
    } else if (conditionReturn.toLowerCase().includes('damaged')) {
      damagedQuantity = 1;
    }
  }

  return { damagedQuantity, repairQuantity };
}

export function encodeReturnCondition(damagedQuantity: number, repairQuantity: number): string | null {
  const parts: string[] = [];
  if (damagedQuantity > 0) parts.push(`damaged:${damagedQuantity}`);
  if (repairQuantity > 0) parts.push(`repair:${repairQuantity}`);
  return parts.length > 0 ? parts.join(';') : null;
}

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
  conditionReturn?: string | null,
): EquipmentStatus {
  if (quantityIssued <= 0) return 'not_issued';

  const parsed = parseReturnCondition(conditionReturn);
  const repairQuantity = parsed.repairQuantity;
  const explicitDamagedQuantity =
    parsed.damagedQuantity > 0 ? parsed.damagedQuantity : damagedQuantity;
  const accountedTotal =
    quantityReturned + missingQuantity + explicitDamagedQuantity + repairQuantity;

  if (accountedTotal < quantityIssued) {
    if (quantityReturned > 0 || missingQuantity > 0 || explicitDamagedQuantity > 0 || repairQuantity > 0) {
      return 'partially_returned';
    }
    return 'issued';
  }

  if (missingQuantity > 0) return 'missing';
  if (repairQuantity > 0) return 'repair';
  if (explicitDamagedQuantity > 0) return 'damaged';
  return 'returned';
}
