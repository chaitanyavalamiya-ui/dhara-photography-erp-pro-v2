export function equipmentStatusTone(status: string): string {
  switch (status) {
    case 'AVAILABLE':
      return 'is-green';
    case 'ON_SHOOT':
      return 'is-cyan';
    case 'UNDER_REPAIR':
      return 'is-amber';
    case 'MISSING':
    case 'UNAVAILABLE':
      return 'is-rose';
    case 'RETIRED':
      return 'is-gold';
    default:
      return 'is-gold';
  }
}

export function equipmentCategoryTone(codeOrLabel: string): string {
  const key = codeOrLabel.toLowerCase();
  if (key.includes('camera')) return 'is-gold';
  if (key.includes('lens')) return 'is-cyan';
  if (key.includes('drone')) return 'is-purple';
  if (key.includes('light')) return 'is-amber';
  if (key.includes('audio') || key.includes('mic')) return 'is-magenta';
  if (key.includes('tripod') || key.includes('stand')) return 'is-cyan';
  if (key.includes('card') || key.includes('memory')) return 'is-gold';
  return 'is-gold';
}

export type EquipmentCategoryGlyph =
  | 'camera'
  | 'lens'
  | 'memory'
  | 'drone'
  | 'light'
  | 'audio'
  | 'tripod'
  | 'generic';

export function equipmentCategoryGlyph(codeOrLabel: string): EquipmentCategoryGlyph {
  const key = codeOrLabel.toLowerCase();
  if (key.includes('camera')) return 'camera';
  if (key.includes('lens')) return 'lens';
  if (key.includes('drone')) return 'drone';
  if (key.includes('light')) return 'light';
  if (key.includes('audio') || key.includes('mic')) return 'audio';
  if (key.includes('tripod') || key.includes('stand')) return 'tripod';
  if (key.includes('card') || key.includes('memory')) return 'memory';
  return 'generic';
}
