import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpDown,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Eye,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  Booking,
  BookingFormData,
  BookingSortField,
  BOOKING_STATUS_OPTIONS,
  bookingsService,
} from '@/services/bookings-service';
import { deliveriesService } from '@/services/deliveries-service';
import { useAuthStore } from '@/stores/auth-store';
import { BookingFormModal } from '@/components/bookings/BookingFormModal';
import { BookingViewModal } from '@/components/bookings/BookingViewModal';
import { DeleteBookingDialog } from '@/components/bookings/DeleteBookingDialog';
import { BookingAvatar } from '@/components/bookings/booking-avatar';
import { bookingPaymentClass, bookingStatusClass } from '@/components/bookings/booking-status';
import { DeliveryFormModal } from '@/components/deliveries/DeliveryFormModal';
import { ClientSearchSelect } from '@/components/clients/ClientSearchSelect';
import {
  deriveBookingPaymentStatus,
  formatBookingCurrency,
  formatDate,
  getBookingsEmptyMessage,
} from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { todayIso } from '@/utils/studio-date';
import { cn } from '@/utils/cn';
import './bookings/bookings-page.css';

const SORT_OPTIONS: { value: BookingSortField; label: string }[] = [
  { value: 'eventDate', label: 'Event date' },
  { value: 'bookingNumber', label: 'Booking number' },
  { value: 'clientName', label: 'Client' },
  { value: 'eventType', label: 'Event type' },
  { value: 'totalAmount', label: 'Total amount' },
  { value: 'balanceAmount', label: 'Balance' },
  { value: 'createdAt', label: 'Created' },
];

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
  const today = todayIso();

  const serviceRatesQuery = useQuery({
    queryKey: ['bookings', 'service-rates'],
    queryFn: bookingsService.getServiceRates,
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

  const totalKpiQuery = useQuery({
    queryKey: ['bookings', 'kpi', 'total'],
    queryFn: () => bookingsService.list({ page: 1, limit: 1, status: 'all' }),
  });

  const todayKpiQuery = useQuery({
    queryKey: ['bookings', 'kpi', 'today', today],
    queryFn: () => bookingsService.getCalendar({ dateFrom: today, dateTo: today }),
  });

  const upcomingKpiQuery = useQuery({
    queryKey: ['bookings', 'kpi', 'upcoming', today],
    queryFn: () =>
      bookingsService.list({
        page: 1,
        limit: 1,
        status: 'confirmed',
        dateFrom: today,
        sortBy: 'eventDate',
        sortOrder: 'asc',
      }),
  });

  const enquiryKpiQuery = useQuery({
    queryKey: ['bookings', 'kpi', 'enquiry'],
    queryFn: () => bookingsService.list({ page: 1, limit: 1, status: 'enquiry' }),
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

  const openView = async (booking: Booking) => {
    try {
      const full = await bookingsService.getById(booking.id);
      setViewBooking(full);
    } catch {
      setFeedback({
        type: 'error',
        message: 'Failed to load booking details.',
      });
    }
  };

  const kpiValue = (loading: boolean, value: number | undefined) =>
    loading ? '—' : String(value ?? 0);

  const formSubmitError =
    formMode === 'create' && createMutation.isError
      ? getApiErrorMessage(createMutation.error, 'Failed to create booking.')
      : formMode === 'edit' && updateMutation.isError
        ? getApiErrorMessage(updateMutation.error, 'Failed to update booking.')
        : null;

  return (
    <>
    <div className="dhara-bookings">
      <section className="dhara-bookings-hero">
        <div>
          <p className="dhara-bookings-kicker">DHARA PHOTOGRAPHY ERP PRO</p>
          <h2>Bookings Management</h2>
          <p>તમારી તમામ ઇવેન્ટ અને બુકિંગનું સંપૂર્ણ આયોજન એક જ જગ્યાએ.</p>
        </div>
        <div className="dhara-bookings-hero-art" aria-hidden>
          <svg viewBox="0 0 120 120" fill="none">
            <rect x="18" y="28" width="84" height="72" rx="10" stroke="#ffd45a" strokeWidth="2" />
            <path d="M18 48h84" stroke="#ff4ec8" strokeWidth="1.4" opacity="0.8" />
            <circle cx="86" cy="36" r="5" fill="#22d3ee" />
            <path d="M34 68h28M34 80h20" stroke="#ffe7b8" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 18 L28 8 L48 22" stroke="#c084fc" strokeWidth="1.5" opacity="0.7" />
          </svg>
        </div>
      </section>

      <div className="dhara-bookings-kpis">
        <article className="dhara-bookings-kpi is-gold">
          <div className="dhara-bookings-kpi-top">
            <h3>Total Bookings</h3>
            <span className="dhara-bookings-icon">
              <ClipboardList />
            </span>
          </div>
          <strong>{kpiValue(totalKpiQuery.isLoading, totalKpiQuery.data?.total)}</strong>
          <span>All studio bookings on file</span>
        </article>
        <article className="dhara-bookings-kpi is-cyan">
          <div className="dhara-bookings-kpi-top">
            <h3>Today&apos;s Bookings</h3>
            <span className="dhara-bookings-icon">
              <CalendarDays />
            </span>
          </div>
          <strong>{kpiValue(todayKpiQuery.isLoading, todayKpiQuery.data?.length)}</strong>
          <span>Events occupying today</span>
        </article>
        <article className="dhara-bookings-kpi is-magenta">
          <div className="dhara-bookings-kpi-top">
            <h3>Upcoming Events</h3>
            <span className="dhara-bookings-icon">
              <CalendarRange />
            </span>
          </div>
          <strong>{kpiValue(upcomingKpiQuery.isLoading, upcomingKpiQuery.data?.total)}</strong>
          <span>Confirmed from today onward</span>
        </article>
        <article className="dhara-bookings-kpi is-amber">
          <div className="dhara-bookings-kpi-top">
            <h3>Enquiry Bookings</h3>
            <span className="dhara-bookings-icon">
              <AlertCircle />
            </span>
          </div>
          <strong>{kpiValue(enquiryKpiQuery.isLoading, enquiryKpiQuery.data?.total)}</strong>
          <span>Unconfirmed enquiry status</span>
        </article>
      </div>

      {feedback && (
        <div className={cn('dhara-bookings-flash', feedback.type === 'success' ? 'is-ok' : 'is-bad')}>
          {feedback.message}
        </div>
      )}

      <div className="dhara-bookings-panel dhara-bookings-toolbar">
        <form onSubmit={handleSearchSubmit} className="dhara-bookings-search">
          <Search />
          <input
            placeholder="Search client, event or booking..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            aria-label="Search bookings"
          />
        </form>

        <div className="dhara-bookings-controls">
          <input
            type="date"
            className="dhara-bookings-select"
            value={dateFrom}
            aria-label="From date"
            onChange={(event) => {
              setPage(1);
              setDateFrom(event.target.value);
            }}
          />
          <input
            type="date"
            className="dhara-bookings-select"
            value={dateTo}
            aria-label="To date"
            onChange={(event) => {
              setPage(1);
              setDateTo(event.target.value);
            }}
          />
          <select
            className="dhara-bookings-select"
            value={statusFilter}
            aria-label="Status filter"
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
            className="dhara-bookings-select"
            value={sortBy}
            aria-label="Sort bookings"
            onChange={(event) => {
              setPage(1);
              setSortBy(event.target.value as BookingSortField);
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>
          <select
            className="dhara-bookings-select"
            value={sortOrder}
            aria-label="Sort order"
            onChange={(event) => {
              setPage(1);
              setSortOrder(event.target.value as 'asc' | 'desc');
            }}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
          <ClientSearchSelect
            value={clientFilter}
            onChange={(clientId) => {
              setPage(1);
              setClientFilter(clientId);
            }}
            emptyLabel="All Clients"
          />
          {canCreate && (
            <button type="button" className="dhara-bookings-add" data-robo-target="add-booking" onClick={openCreate}>
              <Plus />
              New Booking
            </button>
          )}
        </div>
      </div>

      <div className="dhara-bookings-panel" style={{ padding: '1.1rem' }}>
        {listQuery.isLoading ? (
          <div className="grid gap-3">
            <div className="dhara-bookings-skel" />
            <div className="dhara-bookings-skel" />
            <div className="dhara-bookings-skel" />
            <p className="text-center text-[#ffe7b8]">Loading bookings...</p>
          </div>
        ) : listQuery.isError ? (
          <div className="dhara-bookings-error">
            <AlertCircle className="mx-auto h-10 w-10 text-rose-300" />
            <h3>Unable to load bookings</h3>
            <p>
              {getApiErrorMessage(listQuery.error, 'Failed to load bookings. Please try again.')}
            </p>
            <button type="button" className="dhara-bookings-ghost mt-4" onClick={() => void listQuery.refetch()}>
              Retry
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="dhara-bookings-empty">
            <CalendarRange className="mx-auto h-12 w-12 text-amber-300" />
            <h3>{getBookingsEmptyMessage(hasFilters)}</h3>
            <p>
              {hasFilters
                ? 'Try a different search, status, client, or date range.'
                : 'Create your first booking by selecting a client and adding services.'}
            </p>
            {canCreate && !hasFilters && (
              <button type="button" className="dhara-bookings-add mt-5" onClick={openCreate}>
                <Plus />
                Create Your First Booking
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="dhara-bookings-table-wrap">
              <table className="dhara-bookings-table">
                <thead>
                  <tr>
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
                      <th key={column.key}>
                        {column.sortable === false ? (
                          column.label
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleSort(column.key as BookingSortField)}
                          >
                            {column.label}
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <BookingRow
                      key={booking.id}
                      booking={booking}
                      canUpdate={canUpdate}
                      canArchive={canArchive}
                      canCreateDelivery={canCreateDelivery}
                      onView={() => void openView(booking)}
                      onEdit={() => openEdit(booking)}
                      onDelivery={() => {
                        setDeliveryPrefillBookingId(booking.id);
                        setDeliveryFormOpen(true);
                      }}
                      onDelete={() => setDeleteBooking(booking)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="dhara-bookings-cards">
              {bookings.map((booking) => (
                <article key={booking.id} className="dhara-bookings-card dhara-bookings-mobile-card">
                  <div className="dhara-bookings-name">
                    <BookingAvatar name={booking.client.fullName} />
                    <div>
                      <p>{booking.client.fullName}</p>
                      <small>{booking.bookingNumber}</small>
                    </div>
                  </div>
                  <p className="mt-3 text-[1.02rem]">{booking.eventType} · {formatDate(booking.eventDate)}</p>
                  <p className="mt-1 text-sm text-amber-100/80">{booking.venue || '—'}</p>
                  <p className="mt-2 dhara-bookings-money">{formatBookingCurrency(booking.totalAmount)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={cn('dhara-bookings-badge', bookingStatusClass(booking.statusCode))}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="dhara-bookings-actions mt-4">
                    <button type="button" onClick={() => void openView(booking)} aria-label="View booking">
                      <Eye />
                    </button>
                    {canUpdate && (
                      <button type="button" onClick={() => openEdit(booking)} aria-label="Edit booking">
                        <Pencil />
                      </button>
                    )}
                    {canCreateDelivery && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryPrefillBookingId(booking.id);
                          setDeliveryFormOpen(true);
                        }}
                        aria-label="Add delivery"
                        title="Add Delivery"
                      >
                        <Package />
                      </button>
                    )}
                    {canArchive && (
                      <button
                        type="button"
                        className="is-danger"
                        onClick={() => setDeleteBooking(booking)}
                        aria-label="Delete booking"
                      >
                        <Trash2 />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {!listQuery.isLoading && bookings.length > 0 && (
          <div className="dhara-bookings-pager">
            <p>
              Page {page} of {totalPages} · {listQuery.data?.total ?? 0} bookings
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="dhara-bookings-ghost"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="dhara-bookings-ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
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
          createMutation.reset();
          updateMutation.reset();
        }}
        onSubmit={handleFormSubmit}
        submitError={formSubmitError}
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
    </>
  );
}

function BookingRow({
  booking,
  canUpdate,
  canArchive,
  canCreateDelivery,
  onView,
  onEdit,
  onDelivery,
  onDelete,
}: {
  booking: Booking;
  canUpdate: boolean;
  canArchive: boolean;
  canCreateDelivery: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelivery: () => void;
  onDelete: () => void;
}) {
  const paymentStatus =
    booking.paymentStatus ??
    deriveBookingPaymentStatus(booking.totalAmount, booking.advanceAmount, booking.balanceAmount);

  return (
    <tr>
      <td className="dhara-bookings-id">{booking.bookingNumber}</td>
      <td>
        <div className="dhara-bookings-name">
          <BookingAvatar name={booking.client.fullName} size="sm" />
          <div>
            <p>{booking.client.fullName}</p>
            <small>{booking.client.mobile}</small>
          </div>
        </div>
      </td>
      <td>{booking.eventType}</td>
      <td>{formatDate(booking.eventDate)}</td>
      <td>{booking.venue || '—'}</td>
      <td>{booking.servicesSummary || '—'}</td>
      <td className="dhara-bookings-money">{formatBookingCurrency(booking.totalAmount)}</td>
      <td>{formatBookingCurrency(booking.advanceAmount)}</td>
      <td className="dhara-bookings-money is-pending">{formatBookingCurrency(booking.balanceAmount)}</td>
      <td>
        <span className={cn('dhara-bookings-badge', bookingPaymentClass(paymentStatus))}>
          {paymentStatus}
        </span>
      </td>
      <td>
        <span className={cn('dhara-bookings-badge', bookingStatusClass(booking.statusCode))}>
          {booking.status}
        </span>
      </td>
      <td>
        <div className="dhara-bookings-actions">
          <button type="button" onClick={onView} aria-label="View booking">
            <Eye />
          </button>
          {canUpdate && (
            <button type="button" onClick={onEdit} aria-label="Edit booking">
              <Pencil />
            </button>
          )}
          {canCreateDelivery && (
            <button type="button" onClick={onDelivery} aria-label="Add delivery" title="Add Delivery">
              <Package />
            </button>
          )}
          {canArchive && (
            <button type="button" className="is-danger" onClick={onDelete} aria-label="Delete booking">
              <Trash2 />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
