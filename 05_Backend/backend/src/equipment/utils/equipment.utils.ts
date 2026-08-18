export const EQUIPMENT_MASTER_CATEGORY = 'equipment_category';

export const EQUIPMENT_TRACKING_TYPES = ['bulk', 'serialized'] as const;
export const EQUIPMENT_CONDITIONS = ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'] as const;
export const EQUIPMENT_STATUSES = [
  'AVAILABLE',
  'ON_SHOOT',
  'UNDER_REPAIR',
  'MISSING',
  'UNAVAILABLE',
  'RETIRED',
] as const;
export const ISSUE_STATUSES = ['OPEN', 'COMPLETED', 'PARTIAL', 'MISSING', 'DAMAGED'] as const;
export const ITEM_RETURN_STATUSES = ['OUT', 'RETURNED', 'PARTIAL', 'MISSING', 'DAMAGED'] as const;
export const HISTORY_ACTIONS = ['ISSUED', 'RETURNED', 'MISSING', 'DAMAGED', 'STATUS_CHANGED'] as const;

export type EquipmentTrackingType = (typeof EQUIPMENT_TRACKING_TYPES)[number];

export function slugifyEquipmentCategory(label: string): string {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  return slug || 'category';
}
export type EquipmentCondition = (typeof EQUIPMENT_CONDITIONS)[number];
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];
export type IssueStatus = (typeof ISSUE_STATUSES)[number];
export type ItemReturnStatus = (typeof ITEM_RETURN_STATUSES)[number];

export function allocateNextIssueNumber(latestNumber?: string | null): string {
  const match = latestNumber?.match(/^EI-(\d+)$/);
  const next = match ? Number(match[1]) + 1 : 1;
  return `EI-${String(next).padStart(6, '0')}`;
}

export function computeItemReturnStatus(params: {
  quantityIssued: number;
  quantityReturned: number;
  missingQuantity: number;
  damagedQuantity: number;
}): ItemReturnStatus {
  const { quantityIssued, quantityReturned, missingQuantity, damagedQuantity } = params;
  const accounted = quantityReturned + missingQuantity;
  if (accounted <= 0) return 'OUT';
  if (accounted < quantityIssued) return 'PARTIAL';
  if (missingQuantity > 0) return 'MISSING';
  if (damagedQuantity > 0) return 'DAMAGED';
  return 'RETURNED';
}

export function computeIssueStatus(items: Array<{
  quantityIssued: number;
  quantityReturned: number;
  missingQuantity: number;
  damagedQuantity: number;
}>): IssueStatus {
  if (items.length === 0) return 'OPEN';
  const totalIssued = items.reduce((sum, item) => sum + item.quantityIssued, 0);
  const totalReturned = items.reduce((sum, item) => sum + item.quantityReturned, 0);
  const totalMissing = items.reduce((sum, item) => sum + item.missingQuantity, 0);
  const totalDamaged = items.reduce((sum, item) => sum + item.damagedQuantity, 0);
  const accounted = totalReturned + totalMissing;
  if (accounted <= 0) return 'OPEN';
  if (accounted < totalIssued) return 'PARTIAL';
  if (totalMissing > 0) return 'MISSING';
  if (totalDamaged > 0) return 'DAMAGED';
  return 'COMPLETED';
}

export function deriveEquipmentStatus(equipment: {
  trackingType: string;
  availableQuantity: number;
  onShootQuantity: number;
  missingQuantity: number;
  underRepairQuantity: number;
}): EquipmentStatus {
  if (equipment.missingQuantity > 0 && equipment.trackingType === 'serialized') {
    return 'MISSING';
  }
  if (equipment.underRepairQuantity > 0 && equipment.availableQuantity <= 0 && equipment.onShootQuantity <= 0) {
    return 'UNDER_REPAIR';
  }
  if (equipment.onShootQuantity > 0 && equipment.availableQuantity <= 0) {
    return 'ON_SHOOT';
  }
  if (equipment.availableQuantity > 0) {
    return 'AVAILABLE';
  }
  if (equipment.missingQuantity > 0) {
    return 'MISSING';
  }
  if (equipment.underRepairQuantity > 0) {
    return 'UNDER_REPAIR';
  }
  return 'UNAVAILABLE';
}

export function isSerializedUnavailable(status: string): boolean {
  return status !== 'AVAILABLE';
}
