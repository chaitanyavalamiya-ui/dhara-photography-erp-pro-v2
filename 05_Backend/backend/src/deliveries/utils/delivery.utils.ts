export const DELIVERABLE_TYPES = [
  'album',
  'mini_album',
  'calendar',
  'pendrive',
  'hard_disk',
  'soft_copy',
  'video',
  'reels',
  'other',
] as const;

export const DELIVERY_STATUSES = ['pending', 'ready', 'delivered'] as const;

export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

const DELIVERABLE_LABELS: Record<DeliverableType, string> = {
  album: 'Album',
  mini_album: 'Mini Album',
  calendar: 'Calendar',
  pendrive: 'Pendrive',
  hard_disk: 'Hard Disk',
  soft_copy: 'Soft Copy / All Photos',
  video: 'Video',
  reels: 'Reels',
  other: 'Other',
};

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pending',
  ready: 'Ready',
  delivered: 'Delivered',
};

export function getDeliverableTypeLabel(type: string): string {
  return DELIVERABLE_LABELS[type as DeliverableType] ?? type;
}

export function getDeliveryStatusLabel(status: string): string {
  return STATUS_LABELS[status as DeliveryStatus] ?? status;
}

export function assertDeliverableType(type: string): DeliverableType {
  if (!DELIVERABLE_TYPES.includes(type as DeliverableType)) {
    throw new Error(`Invalid deliverable type: ${type}`);
  }
  return type as DeliverableType;
}

export function assertDeliveryStatus(status: string): DeliveryStatus {
  if (!DELIVERY_STATUSES.includes(status as DeliveryStatus)) {
    throw new Error(`Invalid delivery status: ${status}`);
  }
  return status as DeliveryStatus;
}

export function defaultTitleForType(type: DeliverableType): string {
  return DELIVERABLE_LABELS[type];
}
