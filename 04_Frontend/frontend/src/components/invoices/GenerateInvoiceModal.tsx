import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { bookingsService } from '@/services/bookings-service';
import { invoicesService } from '@/services/invoices-service';
import { formatCurrency, formatDate } from '@/utils/booking-form';
import { InvoiceDeliverablesFields } from '@/components/invoices/InvoiceDeliverablesFields';
import {
  InvoiceDeliverables,
} from '@/utils/invoice-deliverables';

interface GenerateInvoiceModalProps {
  open: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onGenerate: (bookingId: string, payload: { notes?: string; deliverables: InvoiceDeliverables }) => void;
}

export function GenerateInvoiceModal({
  open,
  isSubmitting,
  onClose,
  onGenerate,
}: GenerateInvoiceModalProps) {
  const [search, setSearch] = useState('');
  const [deliverables, setDeliverables] = useState<InvoiceDeliverables>({
    items: [],
    videoMedia: '',
  });

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'invoice-generate', search],
    queryFn: () =>
      bookingsService.list({
        limit: 100,
        search: search.trim() || undefined,
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
    <div className="dhara-inv-modal">
      <div className="dhara-inv-modal-card is-generate">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2>Generate Invoice</h2>
            <p className="dhara-inv-modal-sub">
              Select deliverables, then choose a booking. Pendrive or Hard Disk is a delivery option
              only and does not change the amount.
            </p>
          </div>
          <button type="button" onClick={onClose} className="dhara-inv-icon-btn" aria-label="Close">
            <X strokeWidth={2.4} absoluteStrokeWidth />
          </button>
        </div>

        <div className="dhara-inv-input-wrap mb-4">
          <Search aria-hidden />
          <input
            className="dhara-inv-input is-icon"
            placeholder="Search booking number, client, mobile..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="dhara-inv-deliverables mb-4">
          <InvoiceDeliverablesFields value={deliverables} onChange={setDeliverables} />
        </div>

        <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-[rgba(255,212,90,0.22)]">
          {isLoading ? (
            <div className="px-6 py-10 text-center text-[1.05rem] font-bold text-[#fff1c9]">
              Loading bookings...
            </div>
          ) : isError ? (
            <div className="px-6 py-10 text-center text-[1.05rem] font-bold text-[#fecaca]">
              Failed to load bookings. Please try again.
            </div>
          ) : bookings.length === 0 ? (
            <div className="px-6 py-10 text-center text-[1.05rem] font-bold text-[#fff1c9]">
              No eligible bookings found. Bookings with existing invoices are hidden.
            </div>
          ) : (
            <table className="dhara-inv-booking-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Client</th>
                  <th>Event</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <p className="dhara-inv-client">{booking.bookingNumber}</p>
                      <p className="dhara-inv-client-sub">{formatDate(booking.eventDate)}</p>
                    </td>
                    <td>
                      <p className="dhara-inv-client">{booking.client.fullName}</p>
                      <p className="dhara-inv-client-sub">{booking.client.mobile}</p>
                    </td>
                    <td>{booking.eventType}</td>
                    <td className="dhara-inv-money is-due">{formatCurrency(booking.totalAmount)}</td>
                    <td>
                      <button
                        type="button"
                        className="dhara-inv-btn is-gold"
                        style={{ minHeight: '2.7rem' }}
                        disabled={isSubmitting}
                        onClick={() => onGenerate(booking.id, { deliverables })}
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
