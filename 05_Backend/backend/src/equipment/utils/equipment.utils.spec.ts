import {
  allocateNextIssueNumber,
  computeIssueStatus,
  computeItemReturnStatus,
  deriveEquipmentStatus,
  slugifyEquipmentCategory,
} from './equipment.utils';

describe('equipment utils', () => {
  it('allocates sequential issue numbers', () => {
    expect(allocateNextIssueNumber(undefined)).toBe('EI-000001');
    expect(allocateNextIssueNumber('EI-000008')).toBe('EI-000009');
  });

  it('calculates missing via issued minus returned', () => {
    expect(
      computeItemReturnStatus({
        quantityIssued: 2,
        quantityReturned: 1,
        missingQuantity: 1,
        damagedQuantity: 0,
      }),
    ).toBe('MISSING');
  });

  it('marks damaged when fully returned damaged', () => {
    expect(
      computeItemReturnStatus({
        quantityIssued: 1,
        quantityReturned: 1,
        missingQuantity: 0,
        damagedQuantity: 1,
      }),
    ).toBe('DAMAGED');
  });

  it('computes issue status from item totals', () => {
    expect(
      computeIssueStatus([
        { quantityIssued: 8, quantityReturned: 7, missingQuantity: 1, damagedQuantity: 1 },
      ]),
    ).toBe('MISSING');
    expect(
      computeIssueStatus([
        { quantityIssued: 1, quantityReturned: 1, missingQuantity: 0, damagedQuantity: 1 },
      ]),
    ).toBe('DAMAGED');
    expect(
      computeIssueStatus([
        { quantityIssued: 2, quantityReturned: 2, missingQuantity: 0, damagedQuantity: 0 },
      ]),
    ).toBe('COMPLETED');
  });

  it('keeps available equipment available when some units remain', () => {
    expect(
      deriveEquipmentStatus({
        trackingType: 'bulk',
        availableQuantity: 4,
        onShootQuantity: 2,
        missingQuantity: 0,
        underRepairQuantity: 0,
      }),
    ).toBe('AVAILABLE');
  });

  it('slugifies equipment category names', () => {
    expect(slugifyEquipmentCategory('LED / Display')).toBe('led_display');
    expect(slugifyEquipmentCategory('Tripod / Stand')).toBe('tripod_stand');
  });
});
