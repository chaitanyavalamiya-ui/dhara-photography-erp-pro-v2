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

export function buildWhatsAppShareUrl(invoice: Invoice): string {
  const mobile = invoice.client.mobile.replace(/\D/g, '');
  const normalizedMobile = mobile.length === 10 ? `91${mobile}` : mobile;

  const message = [
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
    'Thank you for choosing Dhara Photography. Please contact us for payment or any queries.',
    '',
    '— Dhara Photography Patan',
  ].join('\n');

  return `https://wa.me/${normalizedMobile}?text=${encodeURIComponent(message)}`;
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
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; background: #fff; }
          @page { size: A4; margin: 12mm; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>${element.innerHTML}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}
