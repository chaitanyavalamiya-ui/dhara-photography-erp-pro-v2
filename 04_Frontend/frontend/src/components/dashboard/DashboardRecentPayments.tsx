import { Link } from 'react-router-dom';
import type { IncomeRow } from '@/services/accounts-service';
import { formatCurrency, formatDate } from '@/utils/booking-form';
import { DashboardEmpty, DashboardSkeleton } from './DashboardEmpty';
import { QueryErrorPanel } from './QueryErrorPanel';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

interface DashboardRecentPaymentsProps {
  payments?: IncomeRow[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

export function DashboardRecentPayments({
  payments,
  loading,
  error,
  onRetry,
}: DashboardRecentPaymentsProps) {
  return (
    <section className="dhara-dash-panel">
      <div className="dhara-dash-panel-head">
        <h3>Recent Payments</h3>
        <Link to="/accounts" className="dhara-dash-link">
          View accounts →
        </Link>
      </div>
      {loading ? (
        <DashboardSkeleton className="h-36" />
      ) : error ? (
        <QueryErrorPanel error={error} fallback="Failed to load recent payments." onRetry={onRetry} />
      ) : !payments?.length ? (
        <DashboardEmpty message="No payments recorded this month." />
      ) : (
        <div>
          {payments.map((payment) => (
            <div key={payment.id} className="dhara-dash-pay">
              <span className="dhara-dash-avatar" aria-hidden>
                {initials(payment.clientName)}
              </span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#fff8ee', fontSize: '1.02rem' }}>
                  {payment.clientName}
                </p>
                <small style={{ color: '#e2c9a4' }}>
                  {payment.invoiceNumber || payment.receiptNumber || payment.bookingNumber || 'Payment'}
                  {' · '}
                  {formatDate(payment.paymentDate)}
                </small>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ color: '#e8c547', fontSize: '1.2rem' }}>{formatCurrency(payment.amount)}</strong>
                <div>
                  <span className="dhara-dash-badge is-ok">Paid</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
