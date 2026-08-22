import { X } from 'lucide-react';
import { BookingProfitability } from '@/services/reports-service';
import { formatCurrency } from '@/utils/booking-form';
import { cn } from '@/utils/cn';

interface BookingProfitabilityModalProps {
  open: boolean;
  data: BookingProfitability | null;
  loading?: boolean;
  onClose: () => void;
}

export function BookingProfitabilityModal({
  open,
  data,
  loading,
  onClose,
}: BookingProfitabilityModalProps) {
  if (!open) return null;

  return (
    <div className="dhara-rpt-modal">
      <div className="dhara-rpt-modal-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="dhara-rpt-kicker" style={{ letterSpacing: '0.14em' }}>
              Booking Profitability
            </p>
            <h2>{data?.bookingNumber ?? 'Loading…'}</h2>
          </div>
          <button type="button" className="dhara-rpt-icon-btn" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {loading && <p className="dhara-rpt-note">Loading booking details…</p>}
          {data && (
            <>
              <Row label="Client" value={data.clientName} />
              <Row label="Invoice" value={data.invoiceNumber ?? '—'} />
              <Row label="Booking Amount" value={formatCurrency(data.totalBookingAmount)} />
              <Row label="Payments Received" value={formatCurrency(data.totalReceived)} positive />
              <Row label="Outstanding" value={formatCurrency(data.balance)} />
              <Row label="Booking Expenses" value={formatCurrency(data.totalExpenses)} negative />
              <Row
                label="Net Profit / Loss"
                value={formatCurrency(data.netProfit)}
                highlight
                positive={data.netProfit >= 0}
                negative={data.netProfit < 0}
              />
              <Row label="Profit Margin" value={`${data.profitMarginPercent}%`} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  positive,
  negative,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="dhara-rpt-fact" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
      <span>{label}</span>
      <strong
        className={cn(
          positive && 'dhara-rpt-amt is-in',
          negative && 'dhara-rpt-amt is-out',
          highlight && !positive && !negative && 'dhara-rpt-amt is-gold',
        )}
      >
        {value}
      </strong>
    </div>
  );
}
