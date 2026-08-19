export const INVOICE_DELIVERABLE_OPTIONS = [
  'album',
  'mini_album',
  'calendar',
  'video',
  'soft_copy',
  'reels',
  'other',
] as const;

export type InvoiceDeliverableItem = (typeof INVOICE_DELIVERABLE_OPTIONS)[number];
export type InvoiceVideoMedia = '' | 'pendrive' | 'hard_disk';

export interface InvoiceDeliverables {
  items: InvoiceDeliverableItem[];
  videoMedia: InvoiceVideoMedia;
}

const MARKER_PATTERN = /\[\[DHARA_DELIVERABLES\|([^\]|]*)\|([^\]]*)\]\]/;
const ALLOWED_ITEMS = new Set<string>(INVOICE_DELIVERABLE_OPTIONS);

export function emptyInvoiceDeliverables(): InvoiceDeliverables {
  return { items: [], videoMedia: '' };
}

export function parseInvoiceDeliverables(notes?: string | null): InvoiceDeliverables {
  const match = notes?.match(MARKER_PATTERN);
  if (!match) {
    return emptyInvoiceDeliverables();
  }

  const items = match[1]
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is InvoiceDeliverableItem => ALLOWED_ITEMS.has(value));

  const videoMedia: InvoiceVideoMedia =
    match[2] === 'pendrive' || match[2] === 'hard_disk' ? match[2] : '';

  return { items, videoMedia };
}

export function stripInvoiceDeliverableMarker(notes?: string | null): string {
  return (notes ?? '').replace(MARKER_PATTERN, '').trim();
}

export function encodeInvoiceNotes(
  userNotes: string,
  deliverables: InvoiceDeliverables,
): string {
  const rest = userNotes.trim();
  const items = deliverables.items.filter((value) => ALLOWED_ITEMS.has(value));
  const videoMedia: InvoiceVideoMedia =
    deliverables.videoMedia === 'pendrive' || deliverables.videoMedia === 'hard_disk'
      ? deliverables.videoMedia
      : '';
  const hasDeliverables = items.length > 0 || Boolean(videoMedia);

  if (!hasDeliverables) {
    return rest;
  }

  const marker = `[[DHARA_DELIVERABLES|${items.join(',')}|${videoMedia}]]`;
  return rest ? `${marker}\n${rest}` : marker;
}

export function persistInvoiceNotes(
  notes?: string | null,
  deliverables?: InvoiceDeliverables,
): string | null {
  if (deliverables) {
    return encodeInvoiceNotes(stripInvoiceDeliverableMarker(notes), deliverables) || null;
  }
  return notes?.trim() || null;
}
