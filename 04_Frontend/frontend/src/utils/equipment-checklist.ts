import { BookingEquipmentItem } from '@/services/booking-operations-service';

export const EQUIPMENT_PRESETS = [
  'Camera',
  'Lens',
  'Drone',
  'Battery',
  'Memory Card',
  'Flash',
  'Tripod',
  'Mic',
  'LED',
  'Gimbal',
  'Other',
] as const;

export type ReturnDisposition = 'returned' | 'missing' | 'damaged' | 'repair';

export interface ParsedReturnCondition {
  damagedQuantity: number;
  repairQuantity: number;
}

export function parseReturnCondition(conditionReturn?: string | null): ParsedReturnCondition {
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

export function getRepairQuantity(item: BookingEquipmentItem): number {
  if (item.repairQuantity > 0) return item.repairQuantity;
  return parseReturnCondition(item.conditionReturn).repairQuantity;
}

export function getDamagedQuantity(item: BookingEquipmentItem): number {
  const parsed = parseReturnCondition(item.conditionReturn);
  return parsed.damagedQuantity > 0 ? parsed.damagedQuantity : item.damagedQuantity;
}

export function isEquipmentIssued(item: BookingEquipmentItem): boolean {
  return item.status !== 'not_issued' && item.quantityIssued > 0;
}

export function isEquipmentFullyAccounted(item: BookingEquipmentItem): boolean {
  if (!isEquipmentIssued(item)) return true;

  const repairQuantity = getRepairQuantity(item);
  const damagedQuantity = getDamagedQuantity(item);
  const accounted =
    item.quantityReturned + item.missingQuantity + damagedQuantity + repairQuantity;

  return accounted >= item.quantityIssued;
}

export function areAllEquipmentItemsAccounted(items: BookingEquipmentItem[]): boolean {
  const issuedItems = items.filter(isEquipmentIssued);
  if (issuedItems.length === 0) return true;
  return issuedItems.every(isEquipmentFullyAccounted);
}

export function getInventoryStatusLabel(item: BookingEquipmentItem): string {
  if (!isEquipmentIssued(item)) return 'Not issued';

  const repairQuantity = getRepairQuantity(item);
  const damagedQuantity = getDamagedQuantity(item);

  if (item.missingQuantity > 0) return 'Flagged — Missing';
  if (repairQuantity > 0) return 'Unavailable — Repair';
  if (damagedQuantity > 0) return 'Unavailable — Damaged';
  if (isEquipmentFullyAccounted(item) && item.quantityReturned > 0) return 'Available';
  if (item.status === 'issued' || item.status === 'partially_returned') return 'Out on shoot';
  return item.statusLabel;
}

export function getEquipmentStatusBadgeClass(status: string): string {
  switch (status) {
    case 'returned':
      return 'bg-green-500/10 text-green-400';
    case 'issued':
    case 'partially_returned':
      return 'bg-gold/10 text-gold';
    case 'missing':
      return 'bg-red-500/10 text-red-400';
    case 'damaged':
    case 'repair':
      return 'bg-orange-500/10 text-orange-400';
    default:
      return 'bg-gray-500/10 text-gray-400';
  }
}

export function mergeEquipmentRows(
  items: BookingEquipmentItem[],
  selectedNames: Set<string>,
): Array<{ name: string; item?: BookingEquipmentItem; fromPreset: boolean }> {
  const itemByName = new Map(items.map((item) => [item.equipmentName.toLowerCase(), item]));
  const rows: Array<{ name: string; item?: BookingEquipmentItem; fromPreset: boolean }> = [];

  for (const preset of EQUIPMENT_PRESETS) {
    const item = itemByName.get(preset.toLowerCase());
    rows.push({ name: preset, item, fromPreset: true });
    if (item) itemByName.delete(preset.toLowerCase());
  }

  for (const item of items) {
    if (!rows.some((row) => row.item?.id === item.id)) {
      rows.push({ name: item.equipmentName, item, fromPreset: false });
    }
  }

  for (const name of selectedNames) {
    if (!rows.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
      rows.push({ name, fromPreset: false });
    }
  }

  return rows;
}
