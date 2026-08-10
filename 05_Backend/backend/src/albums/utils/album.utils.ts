export const ALBUM_TYPE_CODES = ['standard', 'premium', 'luxury', 'royal'] as const;
export type AlbumTypeCode = (typeof ALBUM_TYPE_CODES)[number];

export const ALBUM_STATUS_CODES = [
  'pending',
  'designing',
  'printing',
  'ready',
  'delivered',
  'cancelled',
] as const;
export type AlbumStatusCode = (typeof ALBUM_STATUS_CODES)[number];

export const ALBUM_TYPE_LABELS: Record<AlbumTypeCode, string> = {
  standard: 'Standard',
  premium: 'Premium',
  luxury: 'Luxury',
  royal: 'Royal',
};

export const ALBUM_STATUS_LABELS: Record<AlbumStatusCode, string> = {
  pending: 'Pending',
  designing: 'Designing',
  printing: 'Printing',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function toDateOnlyLabel(value?: Date | null): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}
