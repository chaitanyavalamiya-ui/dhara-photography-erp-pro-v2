import {
  INVOICE_TAGLINE,
  encodeInvoiceNotes,
  getInvoiceDeliverableLabels,
  parseInvoiceDeliverables,
  stripInvoiceDeliverableMarker,
} from './invoice-deliverables';

describe('invoice-deliverables', () => {
  it('keeps the exact invoice tagline', () => {
    expect(INVOICE_TAGLINE).toBe('Where Your Trust Meets Our Art.');
  });

  it('round-trips Pendrive video delivery without changing other notes', () => {
    const encoded = encodeInvoiceNotes('Balance before delivery.', {
      items: ['album', 'video'],
      videoMedia: 'pendrive',
    });

    expect(parseInvoiceDeliverables(encoded)).toEqual({
      items: ['album', 'video'],
      videoMedia: 'pendrive',
    });
    expect(stripInvoiceDeliverableMarker(encoded)).toBe('Balance before delivery.');
    expect(getInvoiceDeliverableLabels(parseInvoiceDeliverables(encoded))).toEqual([
      'Album',
      'Video',
      'Video Delivery: Pendrive',
    ]);
  });

  it('renders Hard Disk as a video delivery label', () => {
    const encoded = encodeInvoiceNotes('', { items: ['soft_copy'], videoMedia: 'hard_disk' });
    expect(getInvoiceDeliverableLabels(parseInvoiceDeliverables(encoded))).toEqual([
      'All Photos',
      'Video Delivery: Hard Disk',
    ]);
  });
});
