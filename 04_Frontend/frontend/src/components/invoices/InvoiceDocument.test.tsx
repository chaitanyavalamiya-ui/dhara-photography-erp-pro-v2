import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InvoiceDocument } from './InvoiceDocument';
import { Invoice } from '@/services/invoices-service';
import { encodeInvoiceNotes, INVOICE_TAGLINE } from '@/utils/invoice-deliverables';

const invoice: Invoice = {
  id: 'inv-1',
  invoiceNumber: 'INV-000001',
  bookingId: 'b1',
  clientId: 'c1',
  subtotal: 10000,
  discount: 0,
  totalAmount: 10000,
  advanceAmount: 2000,
  balanceAmount: 8000,
  status: 'partially_paid',
  invoiceDate: '2026-08-13',
  isActive: true,
  createdAt: '2026-08-13T00:00:00.000Z',
  updatedAt: '2026-08-13T00:00:00.000Z',
  notes: encodeInvoiceNotes('Handle with care.', {
    items: ['album', 'video'],
    videoMedia: 'pendrive',
  }),
  client: {
    id: 'c1',
    fullName: 'Asha Patel',
    mobile: '9876543210',
  },
  booking: {
    id: 'b1',
    bookingNumber: 'BK-000001',
    eventType: 'Wedding',
    items: [
      {
        id: 'i1',
        serviceName: 'Wedding Photography',
        quantity: 1,
        unit: 'day',
        rate: 10000,
        days: 1,
        amount: 10000,
      },
    ],
  },
};

describe('InvoiceDocument', () => {
  it('renders the exact footer tagline and Pendrive video delivery', () => {
    render(<InvoiceDocument invoice={invoice} />);

    expect(screen.getByText(INVOICE_TAGLINE)).toBeInTheDocument();
    expect(screen.getByText('• Video Delivery: Pendrive')).toBeInTheDocument();
    expect(screen.getByText('• Album')).toBeInTheDocument();
    expect(screen.getByText('Handle with care.')).toBeInTheDocument();
    expect(screen.queryByText(/DHARA_DELIVERABLES/)).not.toBeInTheDocument();
  });
});
