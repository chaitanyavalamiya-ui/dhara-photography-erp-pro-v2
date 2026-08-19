import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  BOOKING_EVENT_TYPES,
  BOOKING_STATUS_OPTIONS,
  Booking,
  BookingFormData,
  bookingsService,
} from '@/services/bookings-service';
import { invoicesService } from '@/services/invoices-service';
import { clientsService } from '@/services/clients-service';
import { settingsService } from '@/services/settings-service';
import { BookingItemsEditor } from '@/components/bookings/BookingItemsEditor';
import { ClientSearchSelect } from '@/components/clients/ClientSearchSelect';
import { calculateBookingTotals, expandPackageToBookingItems, formatBookingCurrency, assertEventDateRange, BOOKING_CLIENT_CHANGE_LOCKED_MESSAGE, isBookingClientChangeLocked } from '@/utils/booking-form';

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

  const packagesQuery = useQuery({
    queryKey: ['settings', 'packages'],
    queryFn: () => settingsService.getPackages(),
    enabled: open,
  });

  const invoiceLockQuery = useQuery({
    queryKey: ['invoices', 'booking-lock', booking?.id],
    enabled: open && mode === 'edit' && Boolean(booking?.bookingNumber),
    queryFn: () =>
      invoicesService.list({
        search: booking!.bookingNumber,
        limit: 20,
        status: 'all',
      }),
  });

  const clientLockQuery = useQuery({
    queryKey: ['bookings', booking?.id, 'client-lock'],
    enabled: open && mode === 'edit' && Boolean(booking?.id),
    queryFn: () => bookingsService.getById(booking!.id),
  });

  const advanceLocked =
    mode === 'edit' &&
    Boolean(invoiceLockQuery.data?.items.some((invoice) => invoice.bookingId === booking?.id));

  const clientChangeLocked =
    mode === 'edit' &&
    (clientLockQuery.isPending ||
      clientLockQuery.isError ||
      isBookingClientChangeLocked(booking?.clientChangeLocked) ||
      isBookingClientChangeLocked(clientLockQuery.data?.clientChangeLocked));

  const showClientLockMessage =
    mode === 'edit' &&
    (isBookingClientChangeLocked(booking?.clientChangeLocked) ||
      isBookingClientChangeLocked(clientLockQuery.data?.clientChangeLocked));

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

  const selectedClientQuery = useQuery({
    queryKey: ['clients', form.clientId],
    queryFn: () => clientsService.getById(form.clientId),
    enabled: open && Boolean(form.clientId),
  });

  const selectedClient =
    selectedClientQuery.data ??
    (mode === 'edit' && booking && form.clientId === booking.clientId
      ? booking.client
      : undefined);

  const [formError, setFormError] = useState<string | null>(null);

  const totals = useMemo(
    () => calculateBookingTotals(form.items, form.discount, form.advanceAmount),
    [form.items, form.discount, form.advanceAmount],
  );

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.clientId) {
      setFormError('Please select a client.');
      return;
    }

    if (clientChangeLocked && booking && form.clientId !== booking.clientId) {
      setFormError(BOOKING_CLIENT_CHANGE_LOCKED_MESSAGE);
      return;
    }

    if (!form.eventDate) {
      setFormError('Please select an event date.');
      return;
    }

    const dateError = assertEventDateRange(form.eventDate, form.eventEndDate);
    if (dateError) {
      setFormError(dateError);
      return;
    }

    if (form.items.length === 0) {
      setFormError('Add at least one service item.');
      return;
    }

    setFormError(null);
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
          {formError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {formError}
            </div>
          )}
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300" htmlFor="booking-client">
                Client <span className="text-gold">*</span>
              </label>
              <ClientSearchSelect
                id="booking-client"
                value={form.clientId}
                onChange={(clientId) => setForm((current) => ({ ...current, clientId }))}
                required
                disabled={clientChangeLocked}
              />
              {showClientLockMessage ? (
                <p className="mt-1 text-xs text-gray-500">{BOOKING_CLIENT_CHANGE_LOCKED_MESSAGE}</p>
              ) : null}
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
              <label className="mb-1.5 block text-sm font-medium text-gray-300" htmlFor="booking-event-date">
                Event Start Date <span className="text-gold">*</span>
              </label>
              <input
                id="booking-event-date"
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
              <label className="mb-1.5 block text-sm font-medium text-gray-300" htmlFor="booking-event-end-date">
                Event End Date
              </label>
              <input
                id="booking-event-end-date"
                type="date"
                className="input-field"
                value={form.eventEndDate ?? ''}
                onChange={(event) =>
                  setForm((current) => ({ ...current, eventEndDate: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Venue</label>
              <input
                className="input-field"
                value={form.venue ?? ''}
                onChange={(event) => setForm((current) => ({ ...current, venue: event.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">City</label>
              <input
                className="input-field"
                value={form.city ?? ''}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Notes</label>
              <textarea
                className="input-field min-h-24 resize-y"
                value={form.notes ?? ''}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
          </div>

          {(packagesQuery.data?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Apply Package</label>
                <select
                  className="input-field"
                  defaultValue=""
                  onChange={(event) => {
                    const pkg = packagesQuery.data?.find((entry) => entry.id === event.target.value);
                    if (!pkg) return;
                    const expanded = expandPackageToBookingItems(pkg, serviceRates);
                    setForm((current) => ({
                      ...current,
                      items: expanded.items,
                      discount: expanded.discount,
                    }));
                    event.target.value = '';
                  }}
                >
                  <option value="">Select a package to auto-fill services...</option>
                  {packagesQuery.data?.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.label}
                      {pkg.offerPrice !== null
                        ? ` (${formatBookingCurrency(pkg.offerPrice)})`
                        : ` (${formatBookingCurrency(pkg.defaultPrice)})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <BookingItemsEditor
            items={form.items}
            serviceRates={serviceRates}
            onChange={(items) => setForm((current) => ({ ...current, items }))}
          />

          <div className="grid gap-4 rounded-xl border border-gold/20 bg-surface-elevated p-5 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Subtotal</p>
              <p className="mt-1 text-lg font-semibold text-gray-100">{formatBookingCurrency(totals.subtotal)}</p>
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
              <p className="mt-1 text-lg font-semibold text-gold">{formatBookingCurrency(totals.totalAmount)}</p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500">Advance</label>
              <input
                type="number"
                min="0"
                className="input-field mt-1"
                value={form.advanceAmount}
                disabled={advanceLocked}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    advanceAmount: Number(event.target.value) || 0,
                  }))
                }
              />
              {advanceLocked && (
                <p className="mt-1 text-xs text-gray-500">
                  Advance is managed from invoice payments.
                </p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Balance</p>
              <p className="mt-1 text-lg font-semibold text-gray-100">
                {formatBookingCurrency(totals.balanceAmount)}
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
