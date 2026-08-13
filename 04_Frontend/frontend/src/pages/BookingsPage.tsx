import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, BookOpen, Eye, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  Booking,
  BookingFormData,
  BookingSortField,
  BOOKING_STATUS_OPTIONS,
  bookingsService,
} from '@/services/bookings-service';
import { clientsService } from '@/services/clients-service';
import { deliveriesService } from '@/services/deliveries-service';
import { useAuthStore } from '@/stores/auth-store';
import { BookingFormModal } from '@/components/bookings/BookingFormModal';
import { BookingViewModal } from '@/components/bookings/BookingViewModal';
import { DeleteBookingDialog } from '@/components/bookings/DeleteBookingDialog';
import { DeliveryFormModal } from '@/components/deliveries/DeliveryFormModal';
import {
  deriveBookingPaymentStatus,
  formatBookingCurrency,
  formatDate,
  getBookingsEmptyMessage,
} from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

export function BookingsPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<BookingSortField>('eventDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);
  const [deleteBooking, setDeleteBooking] = useState<Booking | null>(null);
  const [deliveryFormOpen, setDeliveryFormOpen] = useState(false);
  const [deliveryPrefillBookingId, setDeliveryPrefillBookingId] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const canCreate = hasPermission('bookings.create');
  const canUpdate = hasPermission('bookings.update');
  const canArchive = hasPermission('bookings.archive');
  const canCreateDelivery = hasPermission('delivery.create');

  const serviceRatesQuery = useQuery({
    queryKey: ['bookings', 'service-rates'],
    queryFn: bookingsService.getServiceRates,
  });

  const clientsQuery = useQuery({
    queryKey: ['clients', 'filter-options'],
    queryFn: () => clientsService.list({ limit: 100, status: 'active', sortBy: 'fullName', sortOrder: 'asc' }),
  });

  const listQuery = useQuery({
    queryKey: ['bookings', page, search, statusFilter, clientFilter, dateFrom, dateTo, sortBy, sortOrder],
    queryFn: () =>
      bookingsService.list({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
        clientId: clientFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy,
        sortOrder,
      }),
  });

  const createMutation = useMutation({
    mutationFn: bookingsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setFormOpen(false);
      setSelectedBooking(null);
      setFeedback({ type: 'success', message: 'Booking created successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to create booking.'),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BookingFormData> }) =>
      bookingsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setFormOpen(false);
      setSelectedBooking(null);
      setViewBooking(null);
      setFeedback({ type: 'success', message: 'Booking updated successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to update booking.'),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: bookingsService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setDeleteBooking(null);
      setViewBooking(null);
      setFeedback({ type: 'success', message: 'Booking deleted successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to delete booking.'),
      });
    },
  });

  const createDeliveryMutation = useMutation({
    mutationFn: deliveriesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setDeliveryFormOpen(false);
      setDeliveryPrefillBookingId(undefined);
      setFeedback({ type: 'success', message: 'Delivery item added.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to add delivery item.'),
      });
    },
  });

  const bookings = listQuery.data?.items ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;
  const hasFilters = Boolean(
    search || clientFilter || dateFrom || dateTo || statusFilter !== 'all',
  );

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const toggleSort = (field: BookingSortField) => {
    setPage(1);
    if (sortBy === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortOrder('asc');
  };

  const openCreate = () => {
    setFormMode('create');
    setSelectedBooking(null);
    setFormOpen(true);
  };

  const openEdit = (booking: Booking) => {
    setFormMode('edit');
    setSelectedBooking(booking);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: BookingFormData) => {
    if (formMode === 'create') {
      createMutation.mutate(data);
      return;
    }

    if (selectedBooking) {
      updateMutation.mutate({ id: selectedBooking.id, data });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-100">Bookings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage studio bookings, services, and event schedules.
          </p>
        </div>
        {canCreate && (
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Booking
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            feedback.type === 'success'
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400',
          )}
        >
          {feedback.message}
        </div>
      )}

      <div className="card">
        <div className="mb-5 grid gap-4 xl:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              className="input-field pl-10"
              placeholder="Search booking, client, venue, or city"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </form>

          <select
            className="input-field"
            value={statusFilter}
            onChange={(event) => {
              setPage(1);
              setStatusFilter(event.target.value);
            }}
          >
            <option value="all">All Statuses</option>
            {BOOKING_STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <select
            className="input-field"
            value={clientFilter}
            onChange={(event) => {
              setPage(1);
              setClientFilter(event.target.value);
            }}
          >
            <option value="">All Clients</option>
            {clientsQuery.data?.items.map((client) => (
              <option key={client.id} value={client.id}>
                {client.fullName}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="input-field"
            value={dateFrom}
            onChange={(event) => {
              setPage(1);
              setDateFrom(event.target.value);
            }}
          />

          <input
            type="date"
            className="input-field"
            value={dateTo}
            onChange={(event) => {
              setPage(1);
              setDateTo(event.target.value);
            }}
          />
        </div>

        {listQuery.isLoading ? (
          <div className="flex min-h-48 items-center justify-center text-gray-500">
            Loading bookings...
          </div>
        ) : listQuery.isError ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-red-400">
            {getApiErrorMessage(listQuery.error, 'Failed to load bookings. Please try again.')}
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-surface-border px-6 py-10 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-gray-600" />
            <h3 className="font-display text-lg font-semibold text-gray-200">
              {getBookingsEmptyMessage(hasFilters)}
            </h3>
            <p className="mt-2 max-w-md text-sm text-gray-500">
              {hasFilters
                ? 'Try a different search, status, client, or date range.'
                : 'Create your first booking by selecting a client and adding services.'}
            </p>
            {canCreate && !hasFilters && (
              <button type="button" className="btn-primary mt-5" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Booking
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                  {[
                    { key: 'bookingNumber', label: 'Booking No' },
                    { key: 'clientName', label: 'Client' },
                    { key: 'eventType', label: 'Event Type' },
                    { key: 'eventDate', label: 'Event Date' },
                    { key: 'venue', label: 'Venue', sortable: false },
                    { key: 'services', label: 'Services', sortable: false },
                    { key: 'totalAmount', label: 'Total Amount' },
                    { key: 'advance', label: 'Advance', sortable: false },
                    { key: 'balanceAmount', label: 'Balance' },
                    { key: 'paymentStatus', label: 'Payment', sortable: false },
                    { key: 'status', label: 'Status', sortable: false },
                  ].map((column) => (
                    <th key={column.key} className="px-3 py-3 font-medium">
                      {column.sortable === false ? (
                        column.label
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-gold"
                          onClick={() => toggleSort(column.key as BookingSortField)}
                        >
                          {column.label}
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </th>
                  ))}
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-surface-border/70 transition hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-4 font-medium text-gray-100">{booking.bookingNumber}</td>
                    <td className="px-3 py-4">
                      <p className="text-gray-100">{booking.client.fullName}</p>
                      <p className="text-xs text-gray-500">{booking.client.mobile}</p>
                    </td>
                    <td className="px-3 py-4 text-gray-300">{booking.eventType}</td>
                    <td className="px-3 py-4 text-gray-300">{formatDate(booking.eventDate)}</td>
                    <td className="px-3 py-4 text-gray-300">{booking.venue || '—'}</td>
                    <td className="px-3 py-4 text-gray-400">{booking.servicesSummary || '—'}</td>
                    <td className="px-3 py-4 font-medium text-gold">
                      {formatBookingCurrency(booking.totalAmount)}
                    </td>
                    <td className="px-3 py-4 text-gray-300">
                      {formatBookingCurrency(booking.advanceAmount)}
                    </td>
                    <td className="px-3 py-4 text-gray-300">
                      {formatBookingCurrency(booking.balanceAmount)}
                    </td>
                    <td className="px-3 py-4">
                      {(() => {
                        const paymentStatus =
                          booking.paymentStatus ??
                          deriveBookingPaymentStatus(
                            booking.totalAmount,
                            booking.advanceAmount,
                            booking.balanceAmount,
                          );
                        return (
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium',
                          paymentStatus === 'Paid'
                            ? 'bg-green-500/10 text-green-400'
                            : paymentStatus === 'Partial'
                              ? 'bg-orange-400/10 text-orange-200'
                              : 'bg-gray-500/10 text-gray-400',
                        )}
                      >
                        {paymentStatus}
                      </span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-4">
                      <span className="rounded-full bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold">
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
                          onClick={async () => {
                            try {
                              const full = await bookingsService.getById(booking.id);
                              setViewBooking(full);
                            } catch {
                              setFeedback({
                                type: 'error',
                                message: 'Failed to load booking details.',
                              });
                            }
                          }}
                          aria-label="View booking"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canUpdate && (
                          <button
                            type="button"
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
                            onClick={() => openEdit(booking)}
                            aria-label="Edit booking"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canCreateDelivery && (
                          <button
                            type="button"
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
                            onClick={() => {
                              setDeliveryPrefillBookingId(booking.id);
                              setDeliveryFormOpen(true);
                            }}
                            aria-label="Add delivery"
                            title="Add Delivery"
                          >
                            <Package className="h-4 w-4" />
                          </button>
                        )}
                        {canArchive && (
                          <button
                            type="button"
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-red-400"
                            onClick={() => setDeleteBooking(booking)}
                            aria-label="Delete booking"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!listQuery.isLoading && bookings.length > 0 && (
          <div className="mt-5 flex items-center justify-between border-t border-surface-border pt-4 text-sm text-gray-500">
            <p>
              Page {page} of {totalPages} · {listQuery.data?.total ?? 0} bookings
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <BookingFormModal
        open={formOpen}
        mode={formMode}
        booking={selectedBooking}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        serviceRates={serviceRatesQuery.data ?? []}
        onClose={() => {
          setFormOpen(false);
          setSelectedBooking(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <BookingViewModal
        open={Boolean(viewBooking)}
        booking={viewBooking}
        canEdit={canUpdate}
        onClose={() => setViewBooking(null)}
        onEdit={(booking) => {
          setViewBooking(null);
          openEdit(booking);
        }}
      />

      <DeleteBookingDialog
        open={Boolean(deleteBooking)}
        booking={deleteBooking}
        isDeleting={deleteMutation.isPending}
        onClose={() => setDeleteBooking(null)}
        onConfirm={() => {
          if (deleteBooking) {
            deleteMutation.mutate(deleteBooking.id);
          }
        }}
      />

      <DeliveryFormModal
        open={deliveryFormOpen}
        mode="create"
        prefillBookingId={deliveryPrefillBookingId}
        isSubmitting={createDeliveryMutation.isPending}
        onClose={() => {
          setDeliveryFormOpen(false);
          setDeliveryPrefillBookingId(undefined);
        }}
        onSubmit={(values) => {
          createDeliveryMutation.mutate({
            bookingId: values.bookingId,
            albumId: values.albumId,
            deliverableType: values.deliverableType,
            title: values.title,
            status: values.status,
            expectedDate: values.expectedDate || undefined,
            deliveredDate: values.deliveredDate || undefined,
            notes: values.notes || undefined,
          });
        }}
      />
    </div>
  );
}
