import { formatCurrency, formatDate } from '@/utils/booking-form';
import { Payment } from '@/services/payments-service';

interface InvoicePaymentHistoryProps {
  payments: Payment[];
  isLoading?: boolean;
  isError?: boolean;
  canVoid?: boolean;
  isVoidingId?: string | null;
  onVoid?: (payment: Payment) => void;
}

export function InvoicePaymentHistory({
  payments,
  isLoading,
  isError,
  canVoid,
  isVoidingId,
  onVoid,
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

  const totalPaid = payments
    .filter((payment) => !payment.isVoided)
    .reduce((sum, payment) => sum + payment.amount, 0);

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
              {canVoid && <th className="px-4 py-2.5 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-surface-border/60 text-gray-300">
                <td className="px-4 py-2.5">{formatDate(payment.paymentDate)}</td>
                <td className="px-4 py-2.5">
                  {payment.receiptNumber ?? '—'}
                  {payment.isVoided && (
                    <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] uppercase text-red-400">
                      Voided
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">{payment.paymentModeLabel}</td>
                <td className="px-4 py-2.5">{payment.transactionReference ?? '—'}</td>
                <td
                  className={
                    payment.isVoided
                      ? 'px-4 py-2.5 text-right font-medium text-gray-500 line-through'
                      : 'px-4 py-2.5 text-right font-medium text-green-400'
                  }
                >
                  {formatCurrency(payment.amount)}
                </td>
                {canVoid && (
                  <td className="px-4 py-2.5 text-right">
                    {!payment.isVoided && onVoid && (
                      <button
                        type="button"
                        className="text-xs text-red-400 hover:text-red-300"
                        disabled={isVoidingId === payment.id}
                        onClick={() => onVoid(payment)}
                      >
                        {isVoidingId === payment.id ? 'Voiding…' : 'Void'}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
