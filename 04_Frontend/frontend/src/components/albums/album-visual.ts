import { ALBUM_STATUS_OPTIONS, ALBUM_TYPE_OPTIONS } from '@/services/albums-service';

export function albumStatusLabel(status: string): string {
  return ALBUM_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function albumTypeLabel(type: string): string {
  return ALBUM_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function albumStatusTone(status: string): string {
  switch (status) {
    case 'pending':
      return 'is-pending';
    case 'designing':
      return 'is-designing';
    case 'printing':
      return 'is-printing';
    case 'ready':
      return 'is-ready';
    case 'delivered':
      return 'is-delivered';
    case 'cancelled':
      return 'is-cancelled';
    default:
      return 'is-pending';
  }
}

export function albumTypeTone(type: string): string {
  switch (type) {
    case 'premium':
      return 'is-premium';
    case 'luxury':
      return 'is-luxury';
    case 'royal':
      return 'is-royal';
    default:
      return 'is-standard';
  }
}

export function albumInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'AL';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export const ALBUM_PRODUCTION_STAGES = [
  'pending',
  'designing',
  'printing',
  'ready',
  'delivered',
] as const;
