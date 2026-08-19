import {
  encodeInvoiceNotes,
  parseInvoiceDeliverables,
  persistInvoiceNotes,
  stripInvoiceDeliverableMarker,
} from './invoice-deliverables';

describe('invoice deliverables persistence', () => {
  it('round-trips structured deliverables without dropping user notes', () => {
    const encoded = persistInvoiceNotes('Handle with care.', {
      items: ['album', 'video'],
      videoMedia: 'pendrive',
    });

    expect(parseInvoiceDeliverables(encoded)).toEqual({
      items: ['album', 'video'],
      videoMedia: 'pendrive',
    });
    expect(stripInvoiceDeliverableMarker(encoded)).toBe('Handle with care.');
  });

  it('keeps legacy marker notes when structured deliverables are omitted', () => {
    const legacy = encodeInvoiceNotes('Old note', {
      items: ['reels'],
      videoMedia: '',
    });
    expect(persistInvoiceNotes(legacy)).toBe(legacy);
  });
});
