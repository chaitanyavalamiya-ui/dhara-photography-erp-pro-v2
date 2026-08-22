import { formatCurrency, formatDate } from '@/utils/booking-form';
import { Payment } from '@/services/payments-service';

interface InvoicePaymentHistoryProps {
  payments: Payment[];
  isLoading?: boolean;
  isError?: boolean;
  canVoid?: boolean;
  canEdit?: boolean;
  isVoidingId?: string | null;
  onVoid?: (payment: Payment) => void;
  onEdit?: (payment: Payment) => void;
}

export function InvoicePaymentHistory({
  payments,
  isLoading,
  isError,
  canVoid,
  canEdit,
  isVoidingId,
  onVoid,
  onEdit,
}: InvoicePaymentHistoryProps) {
  if (isLoading) {
    return (
      <div className="dhara-inv-empty" style={{ minHeight: '8rem' }}>
        <p>Loading payment history...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="dhara-inv-error" style={{ minHeight: '8rem' }}>
        <p>Failed to load payment history.</p>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="dhara-inv-empty" style={{ minHeight: '8rem' }}>
        <p>No payments recorded for this invoice yet.</p>
      </div>
    );
  }

  const totalPaid = payments
    .filter((payment) => !payment.isVoided)
    .reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="dhara-inv-pay">
      <div className="dhara-inv-pay-head">
        <h3>Payment History</h3>
        <p>
          Total paid:{' '}
          <span className="font-extrabold text-[#86efac]">{formatCurrency(totalPaid)}</span>
        </p>
      </div>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Receipt</th>
              <th>Method</th>
              <th>Reference</th>
              <th className="text-right">Amount</th>
              {(canVoid || canEdit) && <th className="text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>{formatDate(payment.paymentDate)}</td>
                <td>
                  {payment.receiptNumber ?? '—'}
                  {payment.isVoided && (
                    <span className="dhara-inv-status is-overdue ml-2">Voided</span>
                  )}
                </td>
                <td>{payment.paymentModeLabel}</td>
                <td>{payment.transactionReference ?? '—'}</td>
                <td
                  className={
                    payment.isVoided
                      ? 'text-right font-extrabold text-gray-500 line-through'
                      : 'text-right font-extrabold text-[#86efac]'
                  }
                >
                  {formatCurrency(payment.amount)}
                </td>
                {(canVoid || canEdit) && (
                  <td className="text-right">
                    {!payment.isVoided && (
                      <div className="flex justify-end gap-3">
                        {canEdit && onEdit && (
                          <button type="button" className="dhara-inv-btn is-cyan" style={{ minHeight: '2.5rem' }} onClick={() => onEdit(payment)}>
                            Edit
                          </button>
                        )}
                        {canVoid && onVoid && (
                          <button
                            type="button"
                            className="dhara-inv-btn is-danger"
                            style={{ minHeight: '2.5rem' }}
                            disabled={isVoidingId === payment.id}
                            onClick={() => onVoid(payment)}
                          >
                            {isVoidingId === payment.id ? 'Voiding…' : 'Void'}
                          </button>
                        )}
                      </div>
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
