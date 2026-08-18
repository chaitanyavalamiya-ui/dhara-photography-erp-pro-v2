import {
  formatEquipmentSpecifications,
  getEquipmentSpecFields,
  resolveEquipmentSpecTemplateId,
  sanitizeEquipmentSpecifications,
} from './equipment-specifications';

describe('equipment specifications', () => {
  it('maps category codes and labels to templates', () => {
    expect(resolveEquipmentSpecTemplateId('memory_card')).toBe('memory_card');
    expect(resolveEquipmentSpecTemplateId('Memory Card')).toBe('memory_card');
    expect(resolveEquipmentSpecTemplateId('Tripod / Stand')).toBe('tripod_stand');
    expect(resolveEquipmentSpecTemplateId('Camera')).toBe('camera');
    expect(resolveEquipmentSpecTemplateId('Lens')).toBe('lens');
  });

  it('sanitizes memory card capacity specs', () => {
    const result = sanitizeEquipmentSpecifications(
      { capacity: 256, capacityUnit: 'GB', speedClass: 'V30', type: 'SDXC' },
      'memory_card',
    );
    expect(result.error).toBeUndefined();
    expect(result.specs).toEqual({
      capacity: 256,
      capacityUnit: 'GB',
      speedClass: 'V30',
      type: 'SDXC',
    });
  });

  it('rejects unknown and invalid specification fields', () => {
    expect(sanitizeEquipmentSpecifications({ hack: 'x' }, 'camera').error).toBeTruthy();
    expect(sanitizeEquipmentSpecifications({ capacity: -1 }, 'memory_card').error).toBeTruthy();
    expect(sanitizeEquipmentSpecifications(['bad'], 'lens').error).toBeTruthy();
  });

  it('formats capacity with unit for display', () => {
    const rows = formatEquipmentSpecifications(
      { capacity: 256, capacityUnit: 'GB', speedClass: 'V30', type: 'SDXC' },
      'Memory Card',
    );
    expect(rows.find((row) => row.label === 'Capacity')?.value).toBe('256 GB');
    expect(rows.find((row) => row.label === 'Speed Class')?.value).toBe('V30');
  });

  it('shows lens fields for the lens template', () => {
    expect(getEquipmentSpecFields('lens').map((field) => field.key)).toEqual([
      'focalLength',
      'aperture',
      'mount',
      'stabilization',
    ]);
  });
});
