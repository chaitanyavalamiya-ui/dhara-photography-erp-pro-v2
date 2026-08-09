import { Payment } from '@/services/payments-service';
import { formatCurrency } from '@/utils/booking-form';

interface PaymentReceiptDocumentProps {
  payment: Payment;
  id?: string;
}

export function PaymentReceiptDocument({
  payment,
  id = 'payment-receipt-document',
}: PaymentReceiptDocumentProps) {
  const previousBalance =
    payment.previousBalance ??
    roundBalance(payment.remainingBalance !== undefined
      ? payment.remainingBalance + payment.amount
      : 0);

  return (
    <div
      id={id}
      className="mx-auto w-full max-w-[180mm] bg-white p-8 text-[#1a1a1a]"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      <div className="border-b-4 border-[#6b1d3a] pb-4">
        <h1 className="text-xl font-bold text-[#6b1d3a]">Dhara Photography Patan</h1>
        <p className="text-sm text-[#b8860b]">Payment Receipt</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Receipt No.</p>
          <p className="font-semibold">{payment.receiptNumber ?? '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">Date</p>
          <p className="font-semibold">{payment.paymentDate}</p>
        </div>
        <div>
          <p className="text-gray-500">Client</p>
          <p className="font-semibold">{payment.clientName}</p>
          <p className="text-gray-600">{payment.clientMobile}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">Invoice / Booking</p>
          <p className="font-semibold">{payment.invoiceNumber}</p>
          <p className="text-gray-600">{payment.bookingNumber}</p>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-[#b8860b]/30 bg-[#6b1d3a]/5 p-6 text-center">
        <p className="text-xs uppercase tracking-wider text-gray-500">Amount Received</p>
        <p className="mt-2 text-3xl font-bold text-[#6b1d3a]">{formatCurrency(payment.amount)}</p>
        <p className="mt-2 text-sm text-gray-600">
          via <span className="font-medium">{payment.paymentModeLabel}</span>
        </p>
        {payment.transactionReference && (
          <p className="mt-1 text-xs text-gray-500">Ref: {payment.transactionReference}</p>
        )}
      </div>

      <div className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between border-b border-gray-200 py-2">
          <span className="text-gray-600">Previous Balance</span>
          <span>{formatCurrency(previousBalance)}</span>
        </div>
        <div className="flex justify-between border-b border-gray-200 py-2">
          <span className="text-gray-600">Payment Received</span>
          <span className="font-semibold text-green-700">{formatCurrency(payment.amount)}</span>
        </div>
        <div className="flex justify-between py-2 text-base font-bold text-[#6b1d3a]">
          <span>Remaining Balance</span>
          <span>{formatCurrency(payment.remainingBalance ?? 0)}</span>
        </div>
      </div>

      {payment.notes && (
        <p className="mt-4 text-xs text-gray-500">Note: {payment.notes}</p>
      )}

      <div className="mt-10 border-t border-gray-300 pt-6 text-center text-xs text-gray-500">
        Thank you for your payment. — Dhara Photography Patan
      </div>
    </div>
  );
}

function roundBalance(value: number): number {
  return Math.round(value * 100) / 100;
}

export function printPaymentReceipt(elementId: string): void {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open('', '_blank', 'width=800,height=1000');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html><html><head><title>Receipt</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;color:#1a1a1a}
    @page{size:A4;margin:12mm}</style></head><body>${element.innerHTML}</body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
}

export function buildPaymentWhatsAppUrl(payment: Payment): string {
  const mobile = payment.clientMobile.replace(/\D/g, '');
  const normalized = mobile.length === 10 ? `91${mobile}` : mobile;
  const message = [
    `Dear ${payment.clientName},`,
    '',
    'Thank you for your payment to Dhara Photography Patan.',
    '',
    `Receipt: ${payment.receiptNumber ?? '—'}`,
    `Invoice: ${payment.invoiceNumber}`,
    `Amount: ${formatCurrency(payment.amount)}`,
    `Method: ${payment.paymentModeLabel}`,
    `Balance: ${formatCurrency(payment.remainingBalance ?? 0)}`,
    '',
    '— Dhara Photography Patan',
  ].join('\n');

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
