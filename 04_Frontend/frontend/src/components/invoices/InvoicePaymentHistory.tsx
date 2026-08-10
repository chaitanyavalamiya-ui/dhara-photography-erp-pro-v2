import { Payment } from '@/services/payments-service';
import { formatCurrency, formatDate } from '@/utils/booking-form';

interface InvoicePaymentHistoryProps {
  payments: Payment[];
  isLoading?: boolean;
  isError?: boolean;
}

export function InvoicePaymentHistory({
  payments,
  isLoading,
  isError,
}: InvoicePaymentHistoryProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-elevated px-4 py-6 text-center text-sm text-gray-500">
        Loading payment history...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-6 text-center text-sm text-red-400">
        Failed to load payment history.
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border px-4 py-6 text-center text-sm text-gray-500">
        No payments recorded for this invoice yet.
      </div>
    );
  }

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-elevated">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <h3 className="font-display text-sm font-semibold text-gold">Payment History</h3>
        <p className="text-xs text-gray-500">
          Total paid:{' '}
          <span className="font-semibold text-green-400">{formatCurrency(totalPaid)}</span>
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Receipt</th>
              <th className="px-4 py-2.5">Method</th>
              <th className="px-4 py-2.5">Reference</th>
              <th className="px-4 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-surface-border/60 text-gray-300">
                <td className="px-4 py-2.5">{formatDate(payment.paymentDate)}</td>
                <td className="px-4 py-2.5">{payment.receiptNumber ?? '—'}</td>
                <td className="px-4 py-2.5">{payment.paymentModeLabel}</td>
                <td className="px-4 py-2.5">{payment.transactionReference ?? '—'}</td>
                <td className="px-4 py-2.5 text-right font-medium text-green-400">
                  {formatCurrency(payment.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
