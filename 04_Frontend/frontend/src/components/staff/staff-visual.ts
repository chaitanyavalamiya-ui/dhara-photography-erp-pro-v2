export function staffStatusTone(isActive: boolean): string {
  return isActive ? 'is-green' : 'is-amber';
}

export function staffInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => part[0] ?? '').join('');
  return letters.toUpperCase() || '?';
}

export type StaffRoleGlyph =
  | 'photographer'
  | 'videographer'
  | 'cinematographer'
  | 'editor'
  | 'drone'
  | 'helper'
  | 'album'
  | 'assistant'
  | 'driver'
  | 'other';

export function staffRoleGlyph(role: string): StaffRoleGlyph {
  switch (role) {
    case 'photographer':
      return 'photographer';
    case 'videographer':
      return 'videographer';
    case 'cinematographer':
      return 'cinematographer';
    case 'editor':
      return 'editor';
    case 'drone_operator':
      return 'drone';
    case 'helper':
      return 'helper';
    case 'album_designer':
      return 'album';
    case 'assistant':
      return 'assistant';
    case 'driver':
      return 'driver';
    default:
      return 'other';
  }
}

export function staffRoleTone(role: string): string {
  switch (role) {
    case 'photographer':
      return 'is-gold';
    case 'videographer':
    case 'cinematographer':
      return 'is-cyan';
    case 'editor':
    case 'album_designer':
      return 'is-purple';
    case 'drone_operator':
      return 'is-amber';
    case 'assistant':
    case 'helper':
      return 'is-green';
    default:
      return 'is-gold';
  }
}
