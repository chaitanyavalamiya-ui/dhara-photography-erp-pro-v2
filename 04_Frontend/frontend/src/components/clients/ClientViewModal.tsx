import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Client } from '@/services/clients-service';
import { bookingsService } from '@/services/bookings-service';
import { invoicesService } from '@/services/invoices-service';
import { galleriesService } from '@/services/galleries-service';
import { albumsService } from '@/services/albums-service';
import { paymentsService } from '@/services/payments-service';
import { deliveriesService } from '@/services/deliveries-service';
import { formatCurrency, formatDate } from '@/utils/client-form';

interface ClientViewModalProps {
  open: boolean;
  client: Client | null;
  canEdit?: boolean;
  onClose: () => void;
  onEdit: (client: Client) => void;
}

function HistorySection({
  title,
  loading,
  empty,
  children,
}: {
  title: string;
  loading: boolean;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-elevated p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{title}</p>
      {loading ? (
        <p className="mt-2 text-sm text-gray-500">Loading...</p>
      ) : empty ? (
        <p className="mt-2 text-sm text-gray-500">None yet.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-gray-200">{children}</ul>
      )}
    </div>
  );
}

export function ClientViewModal({ open, client, canEdit = false, onClose, onEdit }: ClientViewModalProps) {
  const enabled = open && Boolean(client?.id);

  const bookingsQuery = useQuery({
    queryKey: ['clients', client?.id, 'bookings'],
    queryFn: () => bookingsService.list({ clientId: client!.id, limit: 20, status: 'all' }),
    enabled,
  });
  const invoicesQuery = useQuery({
    queryKey: ['clients', client?.id, 'invoices'],
    queryFn: () => invoicesService.list({ search: client!.mobile, limit: 20 }),
    enabled,
  });
  const galleriesQuery = useQuery({
    queryKey: ['clients', client?.id, 'galleries'],
    queryFn: () => galleriesService.list({ clientId: client!.id, limit: 20 }),
    enabled,
  });
  const albumsQuery = useQuery({
    queryKey: ['clients', client?.id, 'albums'],
    queryFn: () => albumsService.list({ clientId: client!.id, limit: 20 }),
    enabled,
  });
  const paymentsQuery = useQuery({
    queryKey: ['clients', client?.id, 'payments'],
    queryFn: () => paymentsService.list({ clientId: client!.id, limit: 20 }),
    enabled,
  });
  const deliveriesQuery = useQuery({
    queryKey: ['clients', client?.id, 'deliveries'],
    queryFn: () => deliveriesService.list({ clientId: client!.id, limit: 20 }),
    enabled,
  });

  if (!open || !client) return null;

  const bookings = bookingsQuery.data?.items ?? [];
  const invoices = (invoicesQuery.data?.items ?? []).filter((invoice) => invoice.clientId === client.id);
  const galleries = galleriesQuery.data?.items ?? [];
  const albums = albumsQuery.data?.items ?? [];
  const payments = paymentsQuery.data?.items ?? [];
  const deliveries = deliveriesQuery.data?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">{client.clientNumber}</p>
            <h2 className="font-display text-2xl font-semibold text-gold">{client.fullName}</h2>
            <p className="mt-1 text-sm text-gray-400">{client.status}</p>
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
          {[
            ['Mobile', client.mobile],
            ['WhatsApp', client.whatsapp || '—'],
            ['Email', client.email || '—'],
            ['City', client.city || '—'],
            ['Address', client.address || '—'],
            ['Birthday', formatDate(client.dateOfBirth)],
            ['Anniversary', formatDate(client.anniversaryDate)],
            ['Total Bookings', String(client.totalBookings)],
            ['Total Amount', formatCurrency(client.totalAmount)],
            ['Outstanding Balance', formatCurrency(client.outstandingBalance)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-surface-border bg-surface-elevated p-4">
              <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
              <p className="mt-1 text-sm text-gray-100">{value}</p>
            </div>
          ))}
        </div>

        {client.notes && (
          <div className="mt-4 rounded-lg border border-surface-border bg-surface-elevated p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-300">{client.notes}</p>
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <HistorySection title="Bookings" loading={bookingsQuery.isLoading} empty={bookings.length === 0}>
            {bookings.map((booking) => (
              <li key={booking.id}>
                {booking.bookingNumber} · {booking.eventType} · {booking.status}
              </li>
            ))}
          </HistorySection>
          <HistorySection title="Invoices" loading={invoicesQuery.isLoading} empty={invoices.length === 0}>
            {invoices.map((invoice) => (
              <li key={invoice.id}>
                {invoice.invoiceNumber} · {formatCurrency(invoice.totalAmount)}
              </li>
            ))}
          </HistorySection>
          <HistorySection title="Galleries" loading={galleriesQuery.isLoading} empty={galleries.length === 0}>
            {galleries.map((gallery) => (
              <li key={gallery.id}>{gallery.name}</li>
            ))}
          </HistorySection>
          <HistorySection title="Albums" loading={albumsQuery.isLoading} empty={albums.length === 0}>
            {albums.map((album) => (
              <li key={album.id}>{album.name}</li>
            ))}
          </HistorySection>
          <HistorySection title="Payments" loading={paymentsQuery.isLoading} empty={payments.length === 0}>
            {payments.map((payment) => (
              <li key={payment.id}>
                {payment.receiptNumber ?? 'Payment'} · {formatCurrency(payment.amount)}
              </li>
            ))}
          </HistorySection>
          <HistorySection title="Deliveries" loading={deliveriesQuery.isLoading} empty={deliveries.length === 0}>
            {deliveries.map((delivery) => (
              <li key={delivery.id}>
                {delivery.title} · {delivery.statusLabel}
              </li>
            ))}
          </HistorySection>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-surface-border pt-5">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          {canEdit && !client.archivedAt && (
            <button type="button" className="btn-primary" onClick={() => onEdit(client)}>
              Edit Client
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
