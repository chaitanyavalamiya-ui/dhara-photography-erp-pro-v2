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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl border border-surface-border bg-surface-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">Booking Profitability</p>
            <h2 className="font-display text-lg font-semibold text-gold">
              {data?.bookingNumber ?? 'Loading…'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:text-gold"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-6 text-sm">
          {loading && <p className="text-gray-400">Loading booking details…</p>}
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
    <div className="flex items-center justify-between border-b border-surface-border/60 py-2">
      <span className="text-gray-500">{label}</span>
      <span
        className={cn(
          'font-medium',
          highlight && 'font-display text-base font-bold',
          positive && 'text-green-400',
          negative && 'text-red-400',
          highlight && !positive && !negative && 'text-gold',
        )}
      >
        {value}
      </span>
    </div>
  );
}
