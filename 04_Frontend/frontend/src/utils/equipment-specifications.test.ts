import { describe, expect, it } from 'vitest';
import {
  formatEquipmentSpecifications,
  getEquipmentSpecFields,
  resolveEquipmentSpecTemplateId,
} from './equipment-specifications';

describe('equipment specification templates', () => {
  it('shows memory card capacity fields', () => {
    expect(getEquipmentSpecFields('memory_card').map((field) => field.key)).toContain('capacity');
    expect(resolveEquipmentSpecTemplateId('Memory Card')).toBe('memory_card');
  });

  it('shows lens and camera fields', () => {
    expect(getEquipmentSpecFields('Lens').some((field) => field.key === 'focalLength')).toBe(true);
    expect(getEquipmentSpecFields('Camera').some((field) => field.key === 'sensor')).toBe(true);
  });

  it('formats friendly specification labels', () => {
    const rows = formatEquipmentSpecifications(
      { capacity: 256, capacityUnit: 'GB', speedClass: 'V30', type: 'SDXC' },
      'memory_card',
    );
    expect(rows.find((row) => row.label === 'Capacity')?.value).toBe('256 GB');
    expect(rows.find((row) => row.label === 'Card Type')?.value).toBe('SDXC');
  });
});
