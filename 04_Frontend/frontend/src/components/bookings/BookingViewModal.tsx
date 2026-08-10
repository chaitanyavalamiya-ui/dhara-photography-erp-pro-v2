import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Booking, bookingsService } from '@/services/bookings-service';
import { formatCurrency, formatDate } from '@/utils/booking-form';
import { BookingTeamSection } from './BookingTeamSection';
import { BookingEquipmentSection } from './BookingEquipmentSection';
import { BookingStaffPaymentsSection } from './BookingStaffPaymentsSection';
import { BookingProgressSection } from './BookingProgressSection';
import { BookingHistorySection } from './BookingHistorySection';
import { BookingRemindersSection } from './BookingRemindersSection';
import { cn } from '@/utils/cn';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'services', label: 'Services' },
  { id: 'team', label: 'Team' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'payments', label: 'Payments' },
  { id: 'progress', label: 'Progress' },
  { id: 'history', label: 'History' },
  { id: 'reminders', label: 'Reminders' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface BookingViewModalProps {
  open: boolean;
  booking: Booking | null;
  onClose: () => void;
  onEdit: (booking: Booking) => void;
}

export function BookingViewModal({ open, booking, onClose, onEdit }: BookingViewModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const detailQuery = useQuery({
    queryKey: ['bookings', booking?.id],
    queryFn: () => bookingsService.getById(booking!.id),
    enabled: open && Boolean(booking?.id),
  });

  if (!open || !booking) return null;

  const displayed = detailQuery.data ?? booking;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden">
        <div className="border-b border-surface-border px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">
                {displayed.bookingNumber}
              </p>
              <h2 className="font-display text-2xl font-semibold text-gold">{displayed.eventType}</h2>
              <p className="mt-1 text-sm text-gray-400">{displayed.status}</p>
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

          <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  activeTab === tab.id
                    ? 'bg-gold/15 text-gold'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200',
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {detailQuery.isLoading && activeTab === 'overview' ? (
            <p className="text-sm text-gray-500">Loading booking details...</p>
          ) : detailQuery.isError ? (
            <p className="text-sm text-red-400">Failed to load booking details.</p>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-surface-border bg-surface-elevated p-4">
                      <p className="text-xs uppercase tracking-wider text-gray-500">Client</p>
                      <p className="mt-1 text-sm font-medium text-gray-100">
                        {displayed.client.fullName}
                      </p>
                      <p className="text-sm text-gray-400">{displayed.client.mobile}</p>
                    </div>
                    <div className="rounded-lg border border-surface-border bg-surface-elevated p-4">
                      <p className="text-xs uppercase tracking-wider text-gray-500">Event</p>
                      <p className="mt-1 text-sm text-gray-100">{formatDate(displayed.eventDate)}</p>
                      <p className="mt-2 text-sm text-gray-300">{displayed.venue || '—'}</p>
                      <p className="text-sm text-gray-400">{displayed.city || '—'}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      ['Subtotal', formatCurrency(displayed.subtotal)],
                      ['Discount', formatCurrency(displayed.discount)],
                      ['Grand Total', formatCurrency(displayed.totalAmount)],
                      ['Advance', formatCurrency(displayed.advanceAmount)],
                      ['Balance', formatCurrency(displayed.balanceAmount)],
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
                  {displayed.notes && (
                    <div className="rounded-lg border border-surface-border bg-surface-elevated p-4">
                      <p className="text-xs uppercase tracking-wider text-gray-500">Notes</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-300">{displayed.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'services' && (
                <div className="overflow-x-auto rounded-lg border border-surface-border">
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
                      {displayed.items.map((item) => (
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
              )}

              {activeTab === 'team' && <BookingTeamSection booking={displayed} />}
              {activeTab === 'equipment' && <BookingEquipmentSection booking={displayed} />}
              {activeTab === 'payments' && <BookingStaffPaymentsSection booking={displayed} />}
              {activeTab === 'progress' && <BookingProgressSection booking={displayed} />}
              {activeTab === 'history' && <BookingHistorySection booking={displayed} />}
              {activeTab === 'reminders' && <BookingRemindersSection booking={displayed} />}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-surface-border px-6 py-4">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-primary" onClick={() => onEdit(displayed)}>
            Edit Booking
          </button>
        </div>
      </div>
    </div>
  );
}
