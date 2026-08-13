export const INVOICE_TAGLINE = 'Where Your Trust Meets Our Art.';

export const INVOICE_DELIVERABLE_OPTIONS = [
  { value: 'album', label: 'Album' },
  { value: 'mini_album', label: 'Mini Album / Mini Book' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'video', label: 'Video' },
  { value: 'soft_copy', label: 'All Photos' },
  { value: 'reels', label: 'Reels' },
  { value: 'other', label: 'Other' },
] as const;

export const VIDEO_DELIVERY_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'pendrive', label: 'Pendrive' },
  { value: 'hard_disk', label: 'Hard Disk' },
] as const;

export type InvoiceVideoMedia = '' | 'pendrive' | 'hard_disk';

export interface InvoiceDeliverables {
  items: string[];
  videoMedia: InvoiceVideoMedia;
}

const MARKER_PATTERN = /\[\[DHARA_DELIVERABLES\|([^\]|]*)\|([^\]]*)\]\]/;

export function parseInvoiceDeliverables(notes?: string | null): InvoiceDeliverables {
  const match = notes?.match(MARKER_PATTERN);
  if (!match) {
    return { items: [], videoMedia: '' };
  }

  const allowed = new Set(INVOICE_DELIVERABLE_OPTIONS.map((option) => option.value));
  const items = match[1]
    .split(',')
    .map((value) => value.trim())
    .filter((value) => allowed.has(value as (typeof INVOICE_DELIVERABLE_OPTIONS)[number]['value']));

  const videoMedia: InvoiceVideoMedia =
    match[2] === 'pendrive' || match[2] === 'hard_disk' ? match[2] : '';

  return { items, videoMedia };
}

export function stripInvoiceDeliverableMarker(notes?: string | null): string {
  return (notes ?? '').replace(MARKER_PATTERN, '').trim();
}

export function encodeInvoiceNotes(userNotes: string, deliverables: InvoiceDeliverables): string {
  const rest = userNotes.trim();
  const hasDeliverables = deliverables.items.length > 0 || Boolean(deliverables.videoMedia);

  if (!hasDeliverables) {
    return rest;
  }

  const marker = `[[DHARA_DELIVERABLES|${deliverables.items.join(',')}|${deliverables.videoMedia}]]`;
  return rest ? `${marker}\n${rest}` : marker;
}

export function getInvoiceDeliverableLabels(deliverables: InvoiceDeliverables): string[] {
  const labels = deliverables.items.map((value) => {
    const option = INVOICE_DELIVERABLE_OPTIONS.find((item) => item.value === value);
    return option?.label ?? value;
  });

  if (deliverables.videoMedia === 'pendrive') {
    labels.push('Video Delivery: Pendrive');
  }

  if (deliverables.videoMedia === 'hard_disk') {
    labels.push('Video Delivery: Hard Disk');
  }

  return labels;
}
