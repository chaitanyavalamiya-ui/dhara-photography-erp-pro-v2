export type EquipmentSpecFieldType = 'text' | 'number' | 'select';

export interface EquipmentSpecField {
  key: string;
  label: string;
  type: EquipmentSpecFieldType;
  options?: string[];
}

export type EquipmentSpecifications = Record<string, string | number>;

export const EQUIPMENT_SPEC_TEMPLATES: Record<string, EquipmentSpecField[]> = {
  camera: [
    { key: 'sensor', label: 'Sensor', type: 'text' },
    { key: 'resolution', label: 'Resolution', type: 'text' },
    { key: 'mount', label: 'Mount', type: 'text' },
    { key: 'videoResolution', label: 'Video Resolution', type: 'text' },
  ],
  lens: [
    { key: 'focalLength', label: 'Focal Length', type: 'text' },
    { key: 'aperture', label: 'Maximum Aperture', type: 'text' },
    { key: 'mount', label: 'Mount', type: 'text' },
    { key: 'stabilization', label: 'Stabilization', type: 'select', options: ['Yes', 'No'] },
  ],
  memory_card: [
    { key: 'capacity', label: 'Capacity', type: 'number' },
    { key: 'capacityUnit', label: 'Capacity Unit', type: 'select', options: ['GB', 'TB'] },
    { key: 'speedClass', label: 'Speed Class', type: 'text' },
    { key: 'type', label: 'Card Type', type: 'text' },
  ],
  battery: [
    { key: 'capacity', label: 'Capacity', type: 'number' },
    { key: 'capacityUnit', label: 'Capacity Unit', type: 'select', options: ['mAh', 'Wh'] },
    { key: 'voltage', label: 'Voltage', type: 'text' },
    { key: 'compatibleWith', label: 'Compatible With', type: 'text' },
  ],
  light: [
    { key: 'power', label: 'Power', type: 'text' },
    { key: 'colorTemperature', label: 'Color Temperature', type: 'text' },
    { key: 'mount', label: 'Mount', type: 'text' },
  ],
  microphone: [
    { key: 'type', label: 'Type', type: 'text' },
    { key: 'connector', label: 'Connector', type: 'text' },
    { key: 'polarPattern', label: 'Polar Pattern', type: 'text' },
  ],
  drone: [
    { key: 'flightTime', label: 'Flight Time', type: 'text' },
    { key: 'cameraResolution', label: 'Camera Resolution', type: 'text' },
    { key: 'maxRange', label: 'Maximum Range', type: 'text' },
  ],
  tripod_stand: [
    { key: 'maxHeight', label: 'Maximum Height', type: 'text' },
    { key: 'headType', label: 'Head Type', type: 'text' },
    { key: 'maxLoad', label: 'Maximum Load', type: 'text' },
  ],
  gimbal: [
    { key: 'payload', label: 'Payload', type: 'text' },
    { key: 'batteryRuntime', label: 'Battery Runtime', type: 'text' },
    { key: 'compatibleCamera', label: 'Compatible Camera', type: 'text' },
  ],
  led_display: [
    { key: 'size', label: 'Size', type: 'text' },
    { key: 'resolution', label: 'Resolution', type: 'text' },
    { key: 'brightness', label: 'Brightness', type: 'text' },
  ],
  cable_adapter: [
    { key: 'length', label: 'Length', type: 'text' },
    { key: 'connector', label: 'Connector / Type', type: 'text' },
  ],
  audio: [
    { key: 'type', label: 'Type', type: 'text' },
    { key: 'connector', label: 'Connector', type: 'text' },
    { key: 'range', label: 'Range / Capacity', type: 'text' },
  ],
  other: [{ key: 'additional', label: 'Additional Specifications', type: 'text' }],
};

const SPEC_ALIASES: Record<string, string> = {
  camera: 'camera',
  lens: 'lens',
  memory_card: 'memory_card',
  memorycard: 'memory_card',
  battery: 'battery',
  light: 'light',
  microphone: 'microphone',
  mic: 'microphone',
  drone: 'drone',
  tripod: 'tripod_stand',
  stand: 'tripod_stand',
  tripod_stand: 'tripod_stand',
  gimbal: 'gimbal',
  led: 'led_display',
  display: 'led_display',
  led_display: 'led_display',
  cable: 'cable_adapter',
  adapter: 'cable_adapter',
  cable_adapter: 'cable_adapter',
  audio: 'audio',
  bag: 'other',
  charger: 'other',
  flash: 'other',
  laptop: 'other',
  other: 'other',
};

function normalizeCategoryToken(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function resolveEquipmentSpecTemplateId(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (!value?.trim()) continue;
    const token = normalizeCategoryToken(value);
    if (EQUIPMENT_SPEC_TEMPLATES[token]) return token;
    if (SPEC_ALIASES[token]) return SPEC_ALIASES[token];
  }
  return 'other';
}

export function getEquipmentSpecFields(...values: Array<string | null | undefined>): EquipmentSpecField[] {
  return EQUIPMENT_SPEC_TEMPLATES[resolveEquipmentSpecTemplateId(...values)] ?? EQUIPMENT_SPEC_TEMPLATES.other;
}

export function parseEquipmentSpecifications(value: unknown): EquipmentSpecifications | null {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  const result: EquipmentSpecifications = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) result[key] = raw;
    else if (typeof raw === 'string' && raw.trim()) result[key] = raw.trim();
  }
  return Object.keys(result).length ? result : null;
}

export function formatEquipmentSpecifications(
  specs: EquipmentSpecifications | null | undefined,
  ...categoryValues: Array<string | null | undefined>
): Array<{ key: string; label: string; value: string }> {
  if (!specs) return [];
  const fields = getEquipmentSpecFields(...categoryValues);
  const used = new Set<string>();
  const rows: Array<{ key: string; label: string; value: string }> = [];

  const capacity = specs.capacity;
  const unit = specs.capacityUnit;
  if (capacity !== undefined && unit !== undefined) {
    rows.push({ key: 'capacity', label: 'Capacity', value: `${capacity} ${unit}` });
    used.add('capacity');
    used.add('capacityUnit');
  }

  for (const field of fields) {
    if (used.has(field.key) || specs[field.key] === undefined) continue;
    rows.push({ key: field.key, label: field.label, value: String(specs[field.key]) });
    used.add(field.key);
  }

  for (const [key, value] of Object.entries(specs)) {
    if (used.has(key)) continue;
    rows.push({ key, label: key, value: String(value) });
  }

  return rows;
}
