import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InvoiceDocument } from './InvoiceDocument';
import { INVOICE_PAPER_CSS } from './invoice-paper-styles';
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
    expect(screen.getByText('Tax Invoice')).toBeInTheDocument();
    expect(screen.getByText('Bill To')).toBeInTheDocument();
    expect(screen.getByText('Event Details')).toBeInTheDocument();
    expect(screen.getByText('Asha Patel')).toBeInTheDocument();
    expect(screen.getByText('Grand Total')).toBeInTheDocument();
    expect(screen.getAllByText('Balance Due')).toHaveLength(2);
    expect(screen.getByText('Authorized Signature')).toBeInTheDocument();
    expect(screen.getByText('Payment due as per agreed schedule.')).toBeInTheDocument();
  });

  it('stacks the studio name above PHOTOGRAPHY without a collapsed title line-height', () => {
    render(<InvoiceDocument invoice={invoice} />);

    const title = document.querySelector('.dhara-inv-paper-title') as HTMLElement;
    const dhara = document.querySelector('.dhara-inv-paper-dhara') as HTMLElement;
    const photography = document.querySelector('.dhara-inv-paper-photography') as HTMLElement;

    expect(title).toContainElement(dhara);
    expect(title).toContainElement(photography);
    expect(dhara.compareDocumentPosition(photography) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(INVOICE_PAPER_CSS).toMatch(/\.dhara-inv-paper-title \{[^}]*flex-direction:\s*column/);
    expect(INVOICE_PAPER_CSS).toMatch(/\.dhara-inv-paper-title \{[^}]*line-height:\s*1\.15/);
    expect(INVOICE_PAPER_CSS).not.toMatch(/\.dhara-inv-paper-title \{[^}]*line-height:\s*0\.92/);
    expect(INVOICE_PAPER_CSS).toMatch(/\.dhara-inv-paper-dhara \{[^}]*line-height:\s*1\.15/);
    expect(INVOICE_PAPER_CSS).toMatch(/\.dhara-inv-paper-photography \{[^}]*line-height:\s*1\.35/);
    expect(INVOICE_PAPER_CSS).toMatch(/\.dhara-inv-paper-pay \{[^}]*break-inside:\s*avoid/);
    expect(INVOICE_PAPER_CSS).toMatch(/\.dhara-inv-paper-summary \{[^}]*break-inside:\s*avoid/);
    expect(INVOICE_PAPER_CSS).toMatch(/\.dhara-inv-paper \{[^}]*display:\s*flex/);
    expect(INVOICE_PAPER_CSS).toMatch(/\.dhara-inv-paper-frame \{[^}]*flex:\s*1 1 auto/);
    expect(INVOICE_PAPER_CSS).toMatch(/\.dhara-inv-paper-bottom \{[^}]*margin-top:\s*auto/);
    expect(INVOICE_PAPER_CSS).toMatch(/\.dhara-inv-paper-bottom \{[^}]*break-inside:\s*avoid/);
  });

  it('keeps long names, due dates, and extra service rows readable', () => {
    render(
      <InvoiceDocument
        invoice={{
          ...invoice,
          status: 'paid',
          dueDate: '2026-09-01',
          discount: 500,
          client: {
            ...invoice.client,
            fullName: 'Asha Ben Maheshkumar Patel-Trivedi',
            email: 'asha@example.com',
            city: 'Patan',
          },
          booking: {
            ...invoice.booking,
            eventType: 'Engagement & Reception',
            venue: 'Rajpath Club',
            city: 'Ahmedabad',
            items: [
              ...invoice.booking.items,
              {
                id: 'i2',
                serviceName: 'Cinematography Coverage',
                quantity: 2,
                unit: 'day',
                rate: 8000,
                days: 2,
                amount: 16000,
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText('Asha Ben Maheshkumar Patel-Trivedi')).toBeInTheDocument();
    expect(screen.getByText('Cinematography Coverage')).toBeInTheDocument();
    expect(screen.getAllByText('Paid').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Discount')).toBeInTheDocument();
    expect(screen.getByText(/Rajpath Club/)).toBeInTheDocument();
  });
});
