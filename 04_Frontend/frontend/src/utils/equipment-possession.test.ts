import { describe, expect, it } from 'vitest';
import { EquipmentIssue } from '@/services/equipment-service';
import {
  getEquipmentLineRemaining,
  groupBookingEquipmentByStaff,
  listCurrentlyHoldingEquipment,
} from './equipment-possession';

const cameraOut = {
  id: 'item-cam',
  equipmentId: 'cam-1',
  equipmentName: 'Canon Camera',
  equipmentCode: 'CAM-001',
  category: 'Camera',
  quantityIssued: 1,
  quantityReturned: 0,
  missingQuantity: 0,
  damagedQuantity: 0,
  conditionOut: 'GOOD',
  returnStatus: 'OUT',
};

const lensReturned = {
  id: 'item-lens',
  equipmentId: 'lens-1',
  equipmentName: '24-70mm Lens',
  equipmentCode: 'LN-2470',
  category: 'Lens',
  quantityIssued: 1,
  quantityReturned: 1,
  missingQuantity: 0,
  damagedQuantity: 0,
  conditionOut: 'GOOD',
  returnStatus: 'RETURNED',
};

const lightPartial = {
  id: 'item-light',
  equipmentId: 'led-1',
  equipmentName: 'LED Light',
  equipmentCode: 'LED-02',
  category: 'Light',
  quantityIssued: 2,
  quantityReturned: 1,
  missingQuantity: 0,
  damagedQuantity: 0,
  conditionOut: 'GOOD',
  returnStatus: 'PARTIAL',
};

const rameshIssue: EquipmentIssue = {
  id: 'issue-r',
  issueNumber: 'EI-000010',
  bookingId: 'b1',
  bookingNumber: 'BK-000008',
  clientName: 'Rahul & Priya',
  staffId: 'staff-ramesh',
  staffName: 'Ramesh',
  issuedAt: '2026-08-20T08:00:00.000Z',
  status: 'OPEN',
  items: [cameraOut, lensReturned],
  summary: { totalIssued: 2, totalReturned: 1, totalMissing: 0, totalDamaged: 0 },
};

const maheshIssue: EquipmentIssue = {
  id: 'issue-m',
  issueNumber: 'EI-000011',
  bookingId: 'b1',
  bookingNumber: 'BK-000008',
  clientName: 'Rahul & Priya',
  staffId: 'staff-mahesh',
  staffName: 'Mahesh',
  issuedAt: '2026-08-20T08:30:00.000Z',
  status: 'PARTIAL',
  items: [lightPartial],
  summary: { totalIssued: 2, totalReturned: 1, totalMissing: 0, totalDamaged: 0 },
};

describe('equipment possession', () => {
  it('uses issued minus returned minus missing', () => {
    expect(getEquipmentLineRemaining(cameraOut)).toBe(1);
    expect(getEquipmentLineRemaining(lensReturned)).toBe(0);
    expect(getEquipmentLineRemaining(lightPartial)).toBe(1);
  });

  it('lists currently holding rows and hides fully returned equipment', () => {
    const rows = listCurrentlyHoldingEquipment([rameshIssue, maheshIssue]);
    expect(rows.map((row) => row.equipmentName)).toEqual(['Canon Camera', 'LED Light']);
    expect(rows.find((row) => row.equipmentName === '24-70mm Lens')).toBeUndefined();
    expect(rows[0]).toMatchObject({
      equipmentCode: 'CAM-001',
      remainingQuantity: 1,
      bookingNumber: 'BK-000008',
      issueStatus: 'OPEN',
    });
    expect(rows[1].remainingQuantity).toBe(1);
  });

  it('groups booking equipment under the staff who took it', () => {
    const groups = groupBookingEquipmentByStaff([rameshIssue, maheshIssue]);
    expect(groups.map((group) => group.staffName)).toEqual(['Ramesh', 'Mahesh']);
    expect(groups[0].items.map((item) => `${item.equipmentName} × ${item.displayQuantity} — ${item.state}`)).toEqual([
      'Canon Camera × 1 — Out',
      '24-70mm Lens × 1 — Returned',
    ]);
    expect(groups[1].items).toEqual([
      expect.objectContaining({ equipmentName: 'LED Light', displayQuantity: 1, state: 'Out' }),
    ]);
  });
});
