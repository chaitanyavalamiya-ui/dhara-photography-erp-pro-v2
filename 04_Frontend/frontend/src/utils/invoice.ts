import { Invoice, InvoiceStatus } from '@/services/invoices-service';
import { formatCurrency } from '@/utils/booking-form';

export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case 'unpaid':
      return 'Unpaid';
    case 'partially_paid':
      return 'Partially Paid';
    case 'paid':
      return 'Paid';
    case 'overdue':
      return 'Overdue';
    default:
      return status;
  }
}

export function getInvoiceStatusClass(status: InvoiceStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-green-500/10 text-green-400';
    case 'partially_paid':
      return 'bg-gold/10 text-gold';
    case 'overdue':
      return 'bg-red-500/10 text-red-400';
    default:
      return 'bg-orange-500/10 text-orange-400';
  }
}

export function formatItemQty(item: { unit: string; quantity: number; days: number }): string {
  if (item.unit === 'day') {
    return `${item.days} day${item.days === 1 ? '' : 's'}`;
  }

  return `${item.quantity}`;
}

export function formatItemRate(item: { unit: string; rate: number }): string {
  if (item.unit === 'day') {
    return `${formatCurrency(item.rate)}/day`;
  }

  return formatCurrency(item.rate);
}

export function normalizeWhatsAppPhone(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

export function buildWhatsAppShareText(invoice: Invoice): string {
  return [
    `Dear ${invoice.client.fullName},`,
    '',
    'Greetings from Dhara Photography Patan!',
    '',
    `Invoice: ${invoice.invoiceNumber}`,
    `Booking: ${invoice.booking.bookingNumber}`,
    `Event: ${invoice.booking.eventType}`,
    `Grand Total: ${formatCurrency(invoice.totalAmount)}`,
    `Advance Paid: ${formatCurrency(invoice.advanceAmount)}`,
    `Balance Due: ${formatCurrency(invoice.balanceAmount)}`,
    '',
    'Please find your invoice PDF. Thank you for choosing Dhara Photography.',
    '',
    '— Dhara Photography Patan',
  ].join('\n');
}

export function buildWhatsAppShareUrl(invoice: Invoice): string {
  const phone = normalizeWhatsAppPhone(invoice.client.mobile);
  return `https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsAppShareText(invoice))}`;
}

export function canSharePdfFile(file: File): boolean {
  if (typeof navigator.share !== 'function') {
    return false;
  }
  if (typeof navigator.canShare !== 'function') {
    return true;
  }
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return true;
  }
}

export function isShareAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export async function shareInvoicePdfFile(file: File, title: string): Promise<void> {
  if (typeof navigator.share !== 'function') {
    throw new Error('WHATSAPP_PDF_SHARE_UNSUPPORTED');
  }

  await navigator.share({
    files: [file],
    title,
  });
}

export function printInvoice(elementId: string): void {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  const printWindow = window.open('', '_blank', 'width=900,height=1200');

  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&display=swap"
          rel="stylesheet"
        />
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #fbf6ee; }
          body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; }
          @page { size: A4 portrait; margin: 0; }
          html, body { width: 210mm; height: 297mm; overflow: hidden; background: #fbf6ee; }
          .dhara-inv-paper {
            width: 210mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            height: 297mm !important;
            margin: 0 !important;
            overflow: hidden !important;
          }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>${element.outerHTML}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}
