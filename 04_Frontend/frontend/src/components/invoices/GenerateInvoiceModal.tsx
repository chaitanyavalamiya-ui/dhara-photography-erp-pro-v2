import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { bookingsService } from '@/services/bookings-service';
import { invoicesService } from '@/services/invoices-service';
import { formatCurrency, formatDate } from '@/utils/booking-form';

interface GenerateInvoiceModalProps {
  open: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onGenerate: (bookingId: string) => void;
}

export function GenerateInvoiceModal({
  open,
  isSubmitting,
  onClose,
  onGenerate,
}: GenerateInvoiceModalProps) {
  const [search, setSearch] = useState('');

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'invoice-generate'],
    queryFn: () =>
      bookingsService.list({
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    enabled: open,
  });

  const invoicedBookingsQuery = useQuery({
    queryKey: ['invoices', 'invoiced-booking-ids'],
    queryFn: async () => {
      const bookingIds: string[] = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const result = await invoicesService.list({ limit: 100, status: 'all', page });
        bookingIds.push(...result.items.map((invoice) => invoice.bookingId));
        totalPages = result.totalPages;
        page += 1;
      }

      return bookingIds;
    },
    enabled: open,
  });

  if (!open) return null;

  const existingBookingIds = new Set(invoicedBookingsQuery.data ?? []);

  const term = search.trim().toLowerCase();
  const bookings = (bookingsQuery.data?.items ?? []).filter((booking) => {
    const alreadyInvoiced = existingBookingIds.has(booking.id);
    if (alreadyInvoiced) return false;

    if (!term) return true;

    return (
      booking.bookingNumber.toLowerCase().includes(term) ||
      booking.client.fullName.toLowerCase().includes(term) ||
      booking.client.mobile.includes(term) ||
      booking.eventType.toLowerCase().includes(term)
    );
  });

  const isLoading = bookingsQuery.isLoading || invoicedBookingsQuery.isLoading;
  const isError = bookingsQuery.isError || invoicedBookingsQuery.isError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[90vh] w-full max-w-3xl overflow-hidden">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">Generate Invoice</h2>
            <p className="mt-1 text-sm text-gray-400">
              Select a booking to create an invoice from existing booking data.
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

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            className="input-field pl-10"
            placeholder="Search booking number, client, mobile..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-surface-border">
          {isLoading ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">Loading bookings...</div>
          ) : isError ? (
            <div className="px-6 py-10 text-center text-sm text-red-400">
              Failed to load bookings. Please try again.
            </div>
          ) : bookings.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              No eligible bookings found. Bookings with existing invoices are hidden.
            </div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface-elevated text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-t border-surface-border hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-100">{booking.bookingNumber}</p>
                      <p className="text-xs text-gray-500">{formatDate(booking.eventDate)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-200">{booking.client.fullName}</p>
                      <p className="text-xs text-gray-500">{booking.client.mobile}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{booking.eventType}</td>
                    <td className="px-4 py-3 font-medium text-gold">
                      {formatCurrency(booking.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="btn-primary px-3 py-1.5 text-xs"
                        disabled={isSubmitting}
                        onClick={() => onGenerate(booking.id)}
                      >
                        {isSubmitting ? 'Generating...' : 'Generate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
