import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Booking, bookingsService } from '@/services/bookings-service';
import { albumsService } from '@/services/albums-service';
import { deliveriesService } from '@/services/deliveries-service';
import { galleriesService } from '@/services/galleries-service';
import { invoicesService } from '@/services/invoices-service';
import { useAuthStore } from '@/stores/auth-store';
import { deriveBookingPaymentStatus, formatBookingCurrency, formatDate } from '@/utils/booking-form';
import { BookingTeamSection } from './BookingTeamSection';
import { BookingEquipmentSection } from './BookingEquipmentSection';
import { BookingInventorySection } from './BookingInventorySection';
import { BookingStaffPaymentsSection } from './BookingStaffPaymentsSection';
import { BookingProgressSection } from './BookingProgressSection';
import { BookingHistorySection } from './BookingHistorySection';
import { BookingRemindersSection } from './BookingRemindersSection';
import { cn } from '@/utils/cn';
import { bookingPaymentClass, bookingStatusClass } from '@/components/bookings/booking-status';
import '@/pages/bookings/bookings-page.css';

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
  canEdit?: boolean;
  onClose: () => void;
  onEdit: (booking: Booking) => void;
}

export function BookingViewModal({
  open,
  booking,
  canEdit = false,
  onClose,
  onEdit,
}: BookingViewModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const detailQuery = useQuery({
    queryKey: ['bookings', booking?.id],
    queryFn: () => bookingsService.getById(booking!.id),
    enabled: open && Boolean(booking?.id),
  });

  if (!open || !booking) return null;

  const displayed = detailQuery.data ?? booking;
  const paymentStatus =
    displayed.paymentStatus ??
    deriveBookingPaymentStatus(
      displayed.totalAmount,
      displayed.advanceAmount,
      displayed.balanceAmount,
    );

  return (
    <div className="dhara-bookings dhara-bookings-modal">
      <div className="dhara-bookings-modal-card is-wide flex max-h-[92vh] flex-col overflow-hidden">
        <div className="border-b border-[rgba(255,212,90,0.16)] pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="dhara-bookings-kicker">{displayed.bookingNumber}</p>
              <h2>{displayed.eventType}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={cn('dhara-bookings-badge', bookingStatusClass(displayed.statusCode))}>
                  {displayed.status}
                </span>
                <span className={cn('dhara-bookings-badge', bookingPaymentClass(paymentStatus))}>
                  {paymentStatus}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[#ffe7b8] transition hover:text-[#ffd45a]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="dhara-bookings-tabs mt-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'is-on' : undefined}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-5">
          {detailQuery.isLoading && activeTab === 'overview' ? (
            <p className="text-sm text-gray-500">Loading booking details...</p>
          ) : detailQuery.isError ? (
            <p className="text-sm text-red-400">Failed to load booking details.</p>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="dhara-bookings-finance sm:!grid-cols-2">
                    <div className="dhara-bookings-fact">
                      <p>Client</p>
                      <strong>{displayed.client.fullName}</strong>
                      <span className="mt-1 block text-[0.95rem] text-[#ffe7b8]">{displayed.client.mobile}</span>
                    </div>
                    <div className="dhara-bookings-fact">
                      <p>Event</p>
                      <strong>{formatDate(displayed.eventDate)}</strong>
                      <span className="mt-1 block text-[0.95rem] text-[#ffe7b8]">{displayed.venue || '—'}</span>
                      <span className="block text-[0.95rem] text-[#ffe7b8]">{displayed.city || '—'}</span>
                    </div>
                  </div>
                  <div className="dhara-bookings-finance">
                    {[
                      ['Subtotal', formatBookingCurrency(displayed.subtotal), ''],
                      ['Discount', formatBookingCurrency(displayed.discount), ''],
                      ['Grand Total', formatBookingCurrency(displayed.totalAmount), 'is-gold'],
                      ['Advance', formatBookingCurrency(displayed.advanceAmount), 'is-ok'],
                      ['Balance', formatBookingCurrency(displayed.balanceAmount), 'is-amber'],
                    ].map(([label, value, tone]) => (
                      <div key={label} className={cn('dhara-bookings-fact', tone)}>
                        <p>{label}</p>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                  {displayed.notes && (
                    <div className="dhara-bookings-fact">
                      <p>Notes</p>
                      <strong className="whitespace-pre-wrap font-semibold">{displayed.notes}</strong>
                    </div>
                  )}
                  <BookingRelatedRecords booking={displayed} hasPermission={hasPermission} />
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
                          <td className="px-4 py-3 text-gray-300">{formatBookingCurrency(item.rate)}</td>
                          <td className="px-4 py-3 font-medium text-gold">{formatBookingCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'team' && <BookingTeamSection booking={displayed} />}
              {activeTab === 'equipment' && (
                <div className="space-y-8">
                  <BookingInventorySection booking={displayed} />
                  <BookingEquipmentSection booking={displayed} />
                </div>
              )}
              {activeTab === 'payments' && <BookingStaffPaymentsSection booking={displayed} />}
              {activeTab === 'progress' && <BookingProgressSection booking={displayed} />}
              {activeTab === 'history' && <BookingHistorySection booking={displayed} />}
              {activeTab === 'reminders' && <BookingRemindersSection booking={displayed} />}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[rgba(255,212,90,0.16)] pt-4">
          <button type="button" className="dhara-bookings-ghost" onClick={onClose}>
            Close
          </button>
          {canEdit && (
            <button type="button" className="dhara-bookings-add" onClick={() => onEdit(displayed)}>
              Edit Booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingRelatedRecords({
  booking,
  hasPermission,
}: {
  booking: Booking;
  hasPermission: (permission: string) => boolean;
}) {
  const canReadInvoices = hasPermission('invoices.read');
  const canReadGallery = hasPermission('gallery.read');
  const canReadAlbums = hasPermission('album.read');
  const canReadDelivery = hasPermission('delivery.read');

  const invoicesQuery = useQuery({
    queryKey: ['invoices', 'booking', booking.id, booking.bookingNumber],
    queryFn: async () => {
      const result = await invoicesService.list({ search: booking.bookingNumber, limit: 20 });
      return result.items.filter((invoice) => invoice.bookingId === booking.id);
    },
    enabled: canReadInvoices,
  });

  const galleriesQuery = useQuery({
    queryKey: ['galleries', 'booking', booking.id],
    queryFn: async () => {
      const result = await galleriesService.list({ bookingId: booking.id, limit: 20 });
      return result.items;
    },
    enabled: canReadGallery,
  });

  const albumsQuery = useQuery({
    queryKey: ['albums', 'booking', booking.id],
    queryFn: async () => {
      const result = await albumsService.list({ bookingId: booking.id, limit: 20 });
      return result.items;
    },
    enabled: canReadAlbums,
  });

  const deliveriesQuery = useQuery({
    queryKey: ['deliveries', 'booking', booking.id],
    queryFn: async () => {
      const result = await deliveriesService.list({ bookingId: booking.id, limit: 20 });
      return result.items;
    },
    enabled: canReadDelivery,
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <RelatedCard
        title="Invoice"
        href="/invoices"
        loading={invoicesQuery.isLoading}
        items={(invoicesQuery.data ?? []).map((invoice) => invoice.invoiceNumber)}
        empty="No invoice linked yet."
        visible={canReadInvoices}
      />
      <RelatedCard
        title="Gallery"
        href="/gallery"
        loading={galleriesQuery.isLoading}
        items={(galleriesQuery.data ?? []).map((gallery) => gallery.name)}
        empty="No gallery linked yet."
        visible={canReadGallery}
      />
      <RelatedCard
        title="Album"
        href="/albums"
        loading={albumsQuery.isLoading}
        items={(albumsQuery.data ?? []).map((album) => album.name)}
        empty="No album linked yet."
        visible={canReadAlbums}
      />
      <RelatedCard
        title="Delivery"
        href="/deliveries"
        loading={deliveriesQuery.isLoading}
        items={(deliveriesQuery.data ?? []).map((item) => item.title)}
        empty="No delivery items yet."
        visible={canReadDelivery}
      />
    </div>
  );
}

function RelatedCard({
  title,
  href,
  loading,
  items,
  empty,
  visible,
}: {
  title: string;
  href: string;
  loading: boolean;
  items: string[];
  empty: string;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <div className="dhara-bookings-fact">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wider text-gray-500">{title}</p>
        <Link to={href} className="text-xs font-medium text-gold hover:underline">
          Open
        </Link>
      </div>
      {loading ? (
        <p className="mt-2 text-sm text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-gray-100">
          {items.slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
