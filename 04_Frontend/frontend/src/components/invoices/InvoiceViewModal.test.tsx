import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoiceViewModal } from './InvoiceViewModal';
import { Invoice } from '@/services/invoices-service';
import { paymentsService } from '@/services/payments-service';
import { downloadInvoicePdf, generateInvoicePdfBlob, triggerPdfFileDownload } from '@/utils/invoice-pdf';
import { printInvoice } from '@/utils/invoice';
import { INVOICE_TAGLINE } from '@/utils/invoice-deliverables';

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
  generateInvoicePdfBlob: vi.fn(),
  triggerPdfFileDownload: vi.fn(),
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
    vi.mocked(downloadInvoicePdf).mockReset();
    vi.mocked(downloadInvoicePdf).mockResolvedValue(undefined as never);
    vi.mocked(generateInvoicePdfBlob).mockReset();
    vi.mocked(generateInvoicePdfBlob).mockResolvedValue({
      blob: new Blob(['%PDF-1.4 invoice'], { type: 'application/pdf' }),
      filename: 'INV-000001-Asha-Patel.pdf',
    });
    vi.mocked(triggerPdfFileDownload).mockReset();
    vi.mocked(paymentsService.void).mockReset();
    vi.mocked(paymentsService.update).mockReset();
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
    expect(documentNode.textContent).toContain('Grand Total');
    expect(documentNode.textContent).toContain('Balance Due');
    expect(documentNode.textContent).toContain('Authorized Signature');
    expect(documentNode.textContent).toContain(INVOICE_TAGLINE);
    expect(documentNode.textContent).toContain('Wedding Photography');
    expect(documentNode.textContent).toMatch(/10,000/);
  });

  it('does not clip the preview paper with overflow hidden or a fixed max-height', () => {
    const css = readFileSync(path.resolve(__dirname, '../../pages/invoices/invoices-page.css'), 'utf8');
    const previewFit = css.match(/\.dhara-inv-preview-fit \{[^}]+\}/)?.[0];
    const previewPaper = css.match(/\.dhara-inv-preview-fit > \.dhara-inv-paper \{[^}]+\}/)?.[0];
    const previewBody = css.match(
      /\.dhara-inv-modal-card\.is-wide \.dhara-inv-modal-body \{[^}]+\}/,
    )?.[0];

    expect(previewFit).toContain('overflow: visible');
    expect(previewFit).toContain('min-width: 0');
    expect(previewFit).not.toContain('overflow: hidden');
    expect(previewFit).not.toMatch(/max-height/);
    expect(previewPaper).toContain('min-width: 0');
    expect(previewPaper).toContain('width: min(210mm, 100%)');
    expect(previewPaper).toContain('min-height: 297mm');
    expect(previewPaper).toContain('max-width: 100%');
    expect(previewBody).toContain('overflow: auto');
    expect(previewBody).toContain('min-height: 0');
    expect(previewBody).not.toContain('overflow: hidden');
  });

  it('shows a generated-PDF notice and clears the loading state after download is triggered', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    vi.mocked(downloadInvoicePdf).mockResolvedValue(undefined as never);
    renderModal({});

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));

    expect(
      await screen.findByText('Invoice PDF generated. Your browser should start the download.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDF' })).not.toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Preparing PDF…' })).not.toBeInTheDocument();
    expect(paymentsService.void).not.toHaveBeenCalled();
    expect(paymentsService.update).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('clears loading and shows an error when PDF generation fails', async () => {
    vi.mocked(downloadInvoicePdf).mockRejectedValue(new Error('PDF capture target was empty.'));
    renderModal({});

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));

    expect(await screen.findByText('PDF capture target was empty.')).toBeInTheDocument();
    expect(screen.queryByText(/Invoice PDF generated/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDF' })).not.toBeDisabled();
  });

  it('allows another PDF download after a completed attempt', async () => {
    vi.mocked(downloadInvoicePdf).mockResolvedValue(undefined as never);
    renderModal({});

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    expect(await screen.findByText(/Invoice PDF generated/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await vi.waitFor(() => {
      expect(downloadInvoicePdf).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText(/Invoice PDF generated/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDF' })).not.toBeDisabled();
  });

  it('disables the PDF button while generation is in progress', async () => {
    let resolveDownload: (() => void) | undefined;
    vi.mocked(downloadInvoicePdf).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDownload = () => resolve(undefined);
        }),
    );
    renderModal({});

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));

    expect(await screen.findByRole('button', { name: 'Preparing PDF…' })).toBeDisabled();
    resolveDownload?.();
    expect(await screen.findByRole('button', { name: 'PDF' })).not.toBeDisabled();
  });

  it('saves the invoice PDF when WhatsApp cannot attach a file', async () => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });

    renderModal({});
    const whatsapp = await screen.findByRole('button', { name: 'WhatsApp' });
    await vi.waitFor(() => {
      expect(whatsapp).not.toBeDisabled();
    });
    fireEvent.click(whatsapp);

    expect(
      await screen.findByText('Invoice PDF saved. Open WhatsApp and send this PDF to the client.'),
    ).toBeInTheDocument();
    expect(generateInvoicePdfBlob).toHaveBeenCalledWith(
      'invoice-document-print',
      'INV-000001',
      'Asha Patel',
    );
    expect(triggerPdfFileDownload).toHaveBeenCalledWith(
      expect.any(Blob),
      'INV-000001-Asha-Patel.pdf',
    );
  });

  it('shares the invoice PDF file with WhatsApp', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });

    renderModal({});
    const whatsapp = await screen.findByRole('button', { name: 'WhatsApp' });
    await vi.waitFor(() => {
      expect(whatsapp).not.toBeDisabled();
    });
    fireEvent.click(whatsapp);

    expect(
      await screen.findByText('Invoice PDF ready. Choose WhatsApp to send the file.'),
    ).toBeInTheDocument();
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Invoice INV-000001',
        files: [expect.any(File)],
      }),
    );
    expect(share.mock.calls[0]?.[0]?.text).toBeUndefined();
    expect(triggerPdfFileDownload).not.toHaveBeenCalled();
  });
});
