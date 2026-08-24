import { describe, expect, it, vi } from 'vitest';
import { Invoice } from '@/services/invoices-service';
import {
  buildWhatsAppShareText,
  buildWhatsAppShareUrl,
  canSharePdfFile,
  normalizeWhatsAppPhone,
  shareInvoicePdfFile,
} from './invoice';

const invoice: Invoice = {
  id: 'inv-1',
  invoiceNumber: 'INV-000001',
  bookingId: 'b1',
  clientId: 'c1',
  subtotal: 10000,
  discount: 0,
  totalAmount: 10000,
  advanceAmount: 5000,
  balanceAmount: 5000,
  status: 'partially_paid',
  invoiceDate: '2026-08-13',
  isActive: true,
  createdAt: '2026-08-13T00:00:00.000Z',
  updatedAt: '2026-08-13T00:00:00.000Z',
  client: { id: 'c1', fullName: 'Asha Patel', mobile: '9876543210' },
  booking: {
    id: 'b1',
    bookingNumber: 'BK-000001',
    eventType: 'Wedding',
    items: [],
  },
};

describe('invoice WhatsApp helpers', () => {
  it('prefixes 10-digit Indian mobiles with 91', () => {
    expect(normalizeWhatsAppPhone('9876543210')).toBe('919876543210');
    expect(normalizeWhatsAppPhone('+91 98765 43210')).toBe('919876543210');
  });

  it('builds a WhatsApp chat URL with invoice totals and PDF note', () => {
    const url = buildWhatsAppShareUrl(invoice);
    expect(url.startsWith('https://wa.me/919876543210?text=')).toBe(true);
    const text = decodeURIComponent(url.split('text=')[1] ?? '');
    expect(text).toContain('INV-000001');
    expect(text).toContain('invoice PDF');
    expect(text).toBe(buildWhatsAppShareText(invoice));
  });

  it('reports file sharing support from the Web Share API', () => {
    const file = new File(['pdf'], 'INV-000001.pdf', { type: 'application/pdf' });
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    expect(canSharePdfFile(file)).toBe(false);

    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: () => true,
    });
    expect(canSharePdfFile(file)).toBe(true);
  });

  it('shares only the PDF file, not a WhatsApp text caption', async () => {
    const file = new File(['pdf'], 'INV-000001.pdf', { type: 'application/pdf' });
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });

    await shareInvoicePdfFile(file, 'Invoice INV-000001');

    expect(share).toHaveBeenCalledWith({ files: [file], title: 'Invoice INV-000001' });
  });
});
