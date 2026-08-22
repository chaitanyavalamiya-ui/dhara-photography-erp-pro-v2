import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoiceViewModal } from './InvoiceViewModal';
import { Invoice } from '@/services/invoices-service';
import { paymentsService } from '@/services/payments-service';
import { downloadInvoicePdf } from '@/utils/invoice-pdf';
import { printInvoice } from '@/utils/invoice';

vi.mock('@/services/payments-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/payments-service')>();
  return {
    ...actual,
    paymentsService: {
      ...actual.paymentsService,
      list: vi.fn(),
      void: vi.fn(),
      update: vi.fn(),
    },
  };
});

vi.mock('@/utils/invoice-pdf', () => ({
  downloadInvoicePdf: vi.fn(),
}));

vi.mock('@/utils/invoice', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/invoice')>();
  return {
    ...actual,
    printInvoice: vi.fn(),
  };
});

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

function renderModal(props: { canUpdate?: boolean; canVoidPayment?: boolean }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <InvoiceViewModal
        open
        invoice={invoice}
        canUpdate={props.canUpdate}
        canVoidPayment={props.canVoidPayment}
        onClose={() => undefined}
        onEdit={() => undefined}
      />
    </QueryClientProvider>,
  );
}

describe('InvoiceViewModal payment void permission', () => {
  beforeEach(() => {
    vi.mocked(paymentsService.list).mockResolvedValue({
      items: [
        {
          id: 'pay-1',
          invoiceId: 'inv-1',
          invoiceNumber: 'INV-000001',
          bookingId: 'b1',
          bookingNumber: 'BK-000001',
          clientId: 'c1',
          clientName: 'Asha Patel',
          clientMobile: '9876543210',
          amount: 5000,
          paymentDate: '2026-08-10',
          paymentModeCode: 'cash',
          paymentModeLabel: 'Cash',
          createdAt: '2026-08-10T00:00:00.000Z',
          isVoided: false,
          receiptNumber: 'RCPT-1',
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
  });

  it('shows void when payments.update is granted', async () => {
    renderModal({ canUpdate: false, canVoidPayment: true });
    expect(await screen.findByRole('button', { name: 'Void' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('hides void when payments.update is missing', async () => {
    renderModal({ canUpdate: false, canVoidPayment: false });
    expect(await screen.findByText('RCPT-1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Void' })).not.toBeInTheDocument();
  });

  it('does not grant void from invoices.update alone', async () => {
    renderModal({ canUpdate: true, canVoidPayment: false });
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Void' })).not.toBeInTheDocument();
  });

  it('keeps print, share, and PDF actions wired on the preview toolbar', async () => {
    vi.mocked(downloadInvoicePdf).mockResolvedValue(undefined as never);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    renderModal({});

    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    expect(printInvoice).toHaveBeenCalledWith('invoice-document-print');

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await vi.waitFor(() => {
      expect(downloadInvoicePdf).toHaveBeenCalledWith(
        'invoice-document-print',
        'INV-000001',
        'Asha Patel',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalled();
    });
  });

  it('keeps the invoice document above payment history and starts the preview at the top', async () => {
    renderModal({});

    const documentNode = await vi.waitFor(() => {
      const node = document.getElementById('invoice-document-print');
      expect(node).toBeTruthy();
      return node as HTMLElement;
    });
    const historyHeading = await screen.findByRole('heading', { name: 'Payment History' });
    const previewBody = document.querySelector('.dhara-inv-modal-body') as HTMLElement;

    expect(documentNode.compareDocumentPosition(historyHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(previewBody.scrollTop).toBe(0);
    expect(documentNode.parentElement?.className).toContain('dhara-inv-preview-fit');
  });
});
