import { X } from 'lucide-react';
import { Booking } from '@/services/bookings-service';
import { formatCurrency, formatDate } from '@/utils/booking-form';

interface BookingViewModalProps {
  open: boolean;
  booking: Booking | null;
  onClose: () => void;
  onEdit: (booking: Booking) => void;
}

export function BookingViewModal({ open, booking, onClose, onEdit }: BookingViewModalProps) {
  if (!open || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[92vh] w-full max-w-4xl overflow-y-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">{booking.bookingNumber}</p>
            <h2 className="font-display text-2xl font-semibold text-gold">{booking.eventType}</h2>
            <p className="mt-1 text-sm text-gray-400">{booking.status}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-surface-border bg-surface-elevated p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Client</p>
            <p className="mt-1 text-sm font-medium text-gray-100">{booking.client.fullName}</p>
            <p className="text-sm text-gray-400">{booking.client.mobile}</p>
            <p className="text-sm text-gray-400">{booking.client.email || '—'}</p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-elevated p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Event</p>
            <p className="mt-1 text-sm text-gray-100">{formatDate(booking.eventDate)}</p>
            {booking.eventEndDate && (
              <p className="text-sm text-gray-400">to {formatDate(booking.eventEndDate)}</p>
            )}
            <p className="mt-2 text-sm text-gray-300">{booking.venue || '—'}</p>
            <p className="text-sm text-gray-400">{booking.city || '—'}</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border border-surface-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-elevated text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Qty / Days</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {booking.items.map((item) => (
                <tr key={item.id ?? item.serviceName} className="border-t border-surface-border">
                  <td className="px-4 py-3 text-gray-100">{item.serviceName}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {item.unit === 'day' ? `${item.days} days` : `${item.quantity}`}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{formatCurrency(item.rate)}</td>
                  <td className="px-4 py-3 font-medium text-gold">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Subtotal', formatCurrency(booking.subtotal)],
            ['Discount', formatCurrency(booking.discount)],
            ['Grand Total', formatCurrency(booking.totalAmount)],
            ['Advance', formatCurrency(booking.advanceAmount)],
            ['Balance', formatCurrency(booking.balanceAmount)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-surface-border bg-surface-elevated p-4"
            >
              <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
              <p className="mt-1 text-sm font-semibold text-gray-100">{value}</p>
            </div>
          ))}
        </div>

        {booking.notes && (
          <div className="mt-4 rounded-lg border border-surface-border bg-surface-elevated p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-300">{booking.notes}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-surface-border pt-5">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-primary" onClick={() => onEdit(booking)}>
            Edit Booking
          </button>
        </div>
      </div>
    </div>
  );
}
