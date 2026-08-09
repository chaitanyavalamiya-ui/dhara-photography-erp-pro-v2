import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  BOOKING_EVENT_TYPES,
  BOOKING_STATUS_OPTIONS,
  Booking,
  BookingFormData,
} from '@/services/bookings-service';
import { clientsService } from '@/services/clients-service';
import { BookingItemsEditor } from '@/components/bookings/BookingItemsEditor';
import { calculateBookingTotals, formatCurrency } from '@/utils/booking-form';

interface BookingFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  booking?: Booking | null;
  prefillDate?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: BookingFormData) => void;
  serviceRates: Awaited<ReturnType<typeof import('@/services/bookings-service').bookingsService.getServiceRates>>;
}

const emptyForm: BookingFormData = {
  clientId: '',
  eventType: 'Wedding',
  eventDate: '',
  eventEndDate: '',
  venue: '',
  city: '',
  notes: '',
  statusCode: 'enquiry',
  items: [],
  discount: 0,
  advanceAmount: 0,
};

export function BookingFormModal({
  open,
  mode,
  booking,
  prefillDate,
  isSubmitting,
  onClose,
  onSubmit,
  serviceRates,
}: BookingFormModalProps) {
  const [form, setForm] = useState<BookingFormData>(emptyForm);

  const clientsQuery = useQuery({
    queryKey: ['clients', 'options'],
    queryFn: () => clientsService.list({ limit: 100, status: 'active', sortBy: 'fullName', sortOrder: 'asc' }),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;

    if (booking) {
      setForm({
        clientId: booking.clientId,
        eventType: booking.eventType,
        eventDate: booking.eventDate ?? '',
        eventEndDate: booking.eventEndDate ?? '',
        venue: booking.venue ?? '',
        city: booking.city ?? '',
        notes: booking.notes ?? '',
        statusCode: booking.statusCode,
        items: booking.items.map((item) => ({ ...item })),
        discount: booking.discount,
        advanceAmount: booking.advanceAmount,
      });
      return;
    }

    setForm({
      ...emptyForm,
      eventDate: prefillDate ?? '',
    });
  }, [open, booking, prefillDate]);

  const selectedClient = useMemo(
    () => clientsQuery.data?.items.find((client) => client.id === form.clientId),
    [clientsQuery.data?.items, form.clientId],
  );

  const totals = useMemo(
    () => calculateBookingTotals(form.items, form.discount, form.advanceAmount),
    [form.items, form.discount, form.advanceAmount],
  );

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.clientId || !form.eventDate || form.items.length === 0) {
      return;
    }

    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[92vh] w-full max-w-5xl overflow-y-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">
              {mode === 'create' ? 'Add Booking' : 'Edit Booking'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Select a client, configure event details, and build the service package.
            </p>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Client <span className="text-gold">*</span>
              </label>
              <select
                className="input-field"
                value={form.clientId}
                onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))}
                required
              >
                <option value="">Select client...</option>
                {clientsQuery.data?.items.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.fullName} ({client.mobile})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Status</label>
              <select
                className="input-field"
                value={form.statusCode}
                onChange={(event) =>
                  setForm((current) => ({ ...current, statusCode: event.target.value }))
                }
              >
                {BOOKING_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedClient && (
            <div className="grid gap-4 rounded-lg border border-gold/20 bg-gold/5 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">Client Name</p>
                <p className="mt-1 text-sm text-gray-100">{selectedClient.fullName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">Mobile</p>
                <p className="mt-1 text-sm text-gray-100">{selectedClient.mobile}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">Email</p>
                <p className="mt-1 text-sm text-gray-100">{selectedClient.email || '—'}</p>
              </div>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Event Type <span className="text-gold">*</span>
              </label>
              <select
                className="input-field"
                value={form.eventType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, eventType: event.target.value }))
                }
                required
              >
                {BOOKING_EVENT_TYPES.map((eventType) => (
                  <option key={eventType} value={eventType}>
                    {eventType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Event Start Date <span className="text-gold">*</span>
              </label>
              <input
                type="date"
                className="input-field"
                value={form.eventDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, eventDate: event.target.value }))
                }
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Event End Date</label>
              <input
                type="date"
                className="input-field"
                value={form.eventEndDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, eventEndDate: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Venue</label>
              <input
                className="input-field"
                value={form.venue}
                onChange={(event) => setForm((current) => ({ ...current, venue: event.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">City</label>
              <input
                className="input-field"
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Notes</label>
              <textarea
                className="input-field min-h-24 resize-y"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
          </div>

          <BookingItemsEditor
            items={form.items}
            serviceRates={serviceRates}
            onChange={(items) => setForm((current) => ({ ...current, items }))}
          />

          <div className="grid gap-4 rounded-xl border border-gold/20 bg-surface-elevated p-5 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Subtotal</p>
              <p className="mt-1 text-lg font-semibold text-gray-100">{formatCurrency(totals.subtotal)}</p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500">Discount</label>
              <input
                type="number"
                min="0"
                className="input-field mt-1"
                value={form.discount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    discount: Number(event.target.value) || 0,
                  }))
                }
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Grand Total</p>
              <p className="mt-1 text-lg font-semibold text-gold">{formatCurrency(totals.totalAmount)}</p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500">Advance</label>
              <input
                type="number"
                min="0"
                className="input-field mt-1"
                value={form.advanceAmount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    advanceAmount: Number(event.target.value) || 0,
                  }))
                }
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Balance</p>
              <p className="mt-1 text-lg font-semibold text-gray-100">
                {formatCurrency(totals.balanceAmount)}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !form.clientId || form.items.length === 0}
            >
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Booking' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
