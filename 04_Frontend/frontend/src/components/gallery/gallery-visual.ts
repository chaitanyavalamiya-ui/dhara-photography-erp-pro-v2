export function galleryEventTone(eventType?: string | null): string {
  switch (eventType) {
    case 'Wedding':
      return 'is-wedding';
    case 'Pre-wedding':
      return 'is-prewedding';
    case 'Engagement':
      return 'is-engagement';
    case 'Birthday':
      return 'is-bday';
    case 'Baby Shower':
      return 'is-shower';
    case 'Couple Photography':
      return 'is-couple';
    default:
      return 'is-other';
  }
}

export function galleryStatusTone(status: string): string {
  switch (status) {
    case 'active':
      return 'is-active';
    case 'client_review':
      return 'is-review';
    case 'approved':
      return 'is-approved';
    case 'delivered':
      return 'is-delivered';
    default:
      return 'is-draft';
  }
}

export function galleryStatusLabel(status: string): string {
  return status.replace('_', ' ');
}
