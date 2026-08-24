import { EquipmentIssue, EquipmentIssueItem } from '@/services/equipment-service';

export function getEquipmentLineRemaining(item: EquipmentIssueItem): number {
  return Math.max(0, item.quantityIssued - item.quantityReturned - item.missingQuantity);
}

export function getEquipmentLinePossessionLabel(item: EquipmentIssueItem): 'Out' | 'Returned' {
  return getEquipmentLineRemaining(item) > 0 ? 'Out' : 'Returned';
}

export interface CurrentlyHoldingEquipmentRow {
  key: string;
  equipmentName: string;
  equipmentCode: string;
  remainingQuantity: number;
  bookingNumber: string;
  issuedAt: string;
  issueStatus: string;
  issueNumber: string;
}

export function listCurrentlyHoldingEquipment(
  issues: EquipmentIssue[],
): CurrentlyHoldingEquipmentRow[] {
  const rows: CurrentlyHoldingEquipmentRow[] = [];
  for (const issue of issues) {
    for (const item of issue.items) {
      const remainingQuantity = getEquipmentLineRemaining(item);
      if (remainingQuantity <= 0) continue;
      rows.push({
        key: `${issue.id}:${item.id}`,
        equipmentName: item.equipmentName,
        equipmentCode: item.equipmentCode,
        remainingQuantity,
        bookingNumber: issue.bookingNumber,
        issuedAt: issue.issuedAt,
        issueStatus: issue.status,
        issueNumber: issue.issueNumber,
      });
    }
  }
  return rows;
}

export interface BookingStaffEquipmentLine {
  key: string;
  equipmentName: string;
  equipmentCode: string;
  displayQuantity: number;
  state: 'Out' | 'Returned';
}

export interface BookingStaffEquipmentGroup {
  staffId: string;
  staffName: string;
  items: BookingStaffEquipmentLine[];
}

export function groupBookingEquipmentByStaff(issues: EquipmentIssue[]): BookingStaffEquipmentGroup[] {
  const groups = new Map<string, BookingStaffEquipmentGroup>();

  for (const issue of issues) {
    const existing = groups.get(issue.staffId) ?? {
      staffId: issue.staffId,
      staffName: issue.staffName,
      items: [],
    };

    for (const item of issue.items) {
      const remainingQuantity = getEquipmentLineRemaining(item);
      const state = remainingQuantity > 0 ? 'Out' : 'Returned';
      existing.items.push({
        key: `${issue.id}:${item.id}`,
        equipmentName: item.equipmentName,
        equipmentCode: item.equipmentCode,
        displayQuantity: state === 'Out' ? remainingQuantity : item.quantityIssued,
        state,
      });
    }

    groups.set(issue.staffId, existing);
  }

  return Array.from(groups.values());
}
