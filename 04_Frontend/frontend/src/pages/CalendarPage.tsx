import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cake, ChevronLeft, ChevronRight, Heart, PartyPopper, Plus, Gem } from 'lucide-react';
import {
  Booking,
  BookingFormData,
  CalendarBookingEvent,
  bookingsService,
} from '@/services/bookings-service';
import { clientsService } from '@/services/clients-service';
import { useAuthStore } from '@/stores/auth-store';
import { BookingFormModal } from '@/components/bookings/BookingFormModal';
import { BookingViewModal } from '@/components/bookings/BookingViewModal';
import {
  CALENDAR_MONTHS,
  buildMonthSummary,
  getBookingDatesInRange,
  getCalendarGridDays,
  getCalendarYearOptions,
  getMonthRange,
  getStatusLabel,
  getStatusStyles,
  getVisibleCalendarRange,
  groupClientMarkersByDate,
  groupOccupyingEventsByDate,
  isSameMonth,
  isToday,
  isWeddingEventType,
  shiftCalendarMonth,
  toDateKey,
} from '@/utils/calendar';
import { formatCurrency, formatDate } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('bookings.create');
  const canUpdate = hasPermission('bookings.update');
  const canReadClients = hasPermission('clients.read');

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [prefillDate, setPrefillDate] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthRange = getMonthRange(year, month);
  const visibleRange = getVisibleCalendarRange(year, month);

  const calendarQuery = useQuery({
    queryKey: ['bookings', 'calendar', visibleRange.dateFrom, visibleRange.dateTo],
    queryFn: () =>
      bookingsService.getCalendar({
        dateFrom: visibleRange.dateFrom,
        dateTo: visibleRange.dateTo,
      }),
  });

  const clientsQuery = useQuery({
    queryKey: ['clients', 'calendar-markers'],
    enabled: canReadClients,
    queryFn: async () => {
      const pageSize = 100;
      const first = await clientsService.list({
        status: 'active',
        limit: pageSize,
        page: 1,
      });
      const items = [...first.items];
      const pages = Math.min(first.totalPages, 10);

      for (let page = 2; page <= pages; page += 1) {
        const next = await clientsService.list({
          status: 'active',
          limit: pageSize,
          page,
        });
        items.push(...next.items);
      }

      return items;
    },
  });

  const upcomingQuery = useQuery({
    queryKey: ['bookings', 'upcoming'],
    queryFn: () => {
      const today = toDateKey(new Date());
      return bookingsService.list({
        dateFrom: today,
        sortBy: 'eventDate',
        sortOrder: 'asc',
        limit: 8,
        status: 'all',
      });
    },
  });

  const serviceRatesQuery = useQuery({
    queryKey: ['bookings', 'service-rates'],
    queryFn: bookingsService.getServiceRates,
  });

  const createMutation = useMutation({
    mutationFn: bookingsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setFormOpen(false);
      setSelectedDay(null);
      setPrefillDate('');
      setEditBooking(null);
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
      setEditBooking(null);
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

  const events = calendarQuery.data ?? [];
  const occupyingEvents = useMemo(
    () => events.filter((event) => event.statusCode !== 'cancelled'),
    [events],
  );
  const summary = useMemo(
    () =>
      buildMonthSummary(
        occupyingEvents.filter(
          (event) => getBookingDatesInRange(event, monthRange.dateFrom, monthRange.dateTo).length > 0,
        ),
      ),
    [occupyingEvents, monthRange.dateFrom, monthRange.dateTo],
  );
  const cancelledCount = useMemo(
    () => events.filter((event) => event.statusCode === 'cancelled').length,
    [events],
  );
  const gridDays = useMemo(() => getCalendarGridDays(year, month), [year, month]);

  const eventsByDate = useMemo(
    () => groupOccupyingEventsByDate(events, visibleRange.dateFrom, visibleRange.dateTo),
    [events, visibleRange.dateFrom, visibleRange.dateTo],
  );
  const clientMarkersByDate = useMemo(
    () =>
      groupClientMarkersByDate(
        clientsQuery.data ?? [],
        visibleRange.dateFrom,
        visibleRange.dateTo,
      ),
    [clientsQuery.data, visibleRange.dateFrom, visibleRange.dateTo],
  );
  const yearOptions = useMemo(() => getCalendarYearOptions(year), [year]);

  const upcomingBookings = upcomingQuery.data?.items ?? [];

  const openCreateForDate = (dateKey: string) => {
    setFormMode('create');
    setEditBooking(null);
    setPrefillDate(dateKey);
    setSelectedDay(null);
    setFormOpen(true);
  };

  const openBookingDetails = async (event: CalendarBookingEvent) => {
    const booking = await bookingsService.getById(event.id);
    setViewBooking(booking);
    setSelectedDay(null);
  };

  const goToMonth = (offset: number) => {
    const next = shiftCalendarMonth(year, month, offset);
    setCurrentDate(new Date(next.year, next.month, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-100">Calendar</h2>
          <p className="mt-1 font-display text-3xl font-semibold text-gold">{monthRange.label}</p>
          <p className="mt-1 text-sm text-gray-500">
            Studio booking schedule, event visibility, and upcoming shoots.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary" onClick={goToToday}>
            Today
          </button>
          <button
            type="button"
            aria-label="Previous month"
            className="btn-secondary"
            onClick={() => goToMonth(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <select
            id="calendar-month"
            aria-label="Month"
            className="input-field min-w-[10.5rem] py-2 text-sm font-semibold"
            value={month}
            onChange={(event) => setCurrentDate(new Date(year, Number(event.target.value), 1))}
          >
            {CALENDAR_MONTHS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
          <select
            id="calendar-year"
            aria-label="Year"
            className="input-field min-w-[6.5rem] py-2 text-sm font-semibold"
            value={year}
            onChange={(event) => setCurrentDate(new Date(Number(event.target.value), month, 1))}
          >
            {yearOptions.map((optionYear) => (
              <option key={optionYear} value={optionYear}>
                {optionYear}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="Next month"
            className="btn-secondary"
            onClick={() => goToMonth(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {[
          ['Total Bookings', summary.totalBookings],
          ['Confirmed', summary.confirmed],
          ['Pending', summary.pending],
          ['Completed', summary.completed],
          ['Cancelled', cancelledCount],
          ['Total Amount', formatCurrency(summary.totalAmount)],
          ['Outstanding', formatCurrency(summary.outstandingBalance)],
        ].map(([label, value]) => (
          <div key={label} className="card border-gold/10 py-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
            <p className="mt-2 text-xl font-semibold text-gray-100">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="card overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-surface-border bg-surface-elevated">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          {calendarQuery.isLoading ? (
            <div className="flex min-h-96 items-center justify-center text-gray-500">
              Loading calendar...
            </div>
          ) : calendarQuery.isError ? (
            <div className="flex min-h-96 items-center justify-center text-red-400">
              Failed to load calendar bookings.
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {gridDays.map((date) => {
                const dateKey = toDateKey(date);
                const dayEvents = eventsByDate.get(dateKey) ?? [];
                const clientMarkers = clientMarkersByDate.get(dateKey) ?? [];
                const inMonth = isSameMonth(date, year, month);
                const today = isToday(date);
                const hasBooking = dayEvents.length > 0;
                const hasWedding = dayEvents.some((event) => isWeddingEventType(event.eventType));
                const birthdays = clientMarkers.filter((marker) => marker.type === 'birthday');
                const anniversaries = clientMarkers.filter((marker) => marker.type === 'anniversary');

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setSelectedDay(dateKey)}
                    className={cn(
                      'min-h-32 border-b border-r border-surface-border p-2 text-left transition hover:bg-white/[0.03]',
                      !inMonth && 'bg-black/10 text-gray-600',
                      today && 'bg-gold/5 ring-1 ring-inset ring-gold/30',
                      hasBooking && inMonth && 'bg-gold/[0.03]',
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={cn(
                          'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                          today ? 'bg-gold text-maroon-dark' : 'text-gray-300',
                        )}
                      >
                        {date.getDate()}
                      </span>
                      <span className="flex items-center gap-0.5" aria-hidden={!hasBooking && clientMarkers.length === 0}>
                        {hasBooking && (
                          <Heart className="h-3.5 w-3.5 fill-current text-rose-400" aria-label="Booked" />
                        )}
                        {hasWedding && (
                          <Gem className="h-3.5 w-3.5 text-gold" aria-label="Wedding" />
                        )}
                        {birthdays.length > 0 && (
                          <Cake className="h-3.5 w-3.5 text-amber-300" aria-label="Birthday" />
                        )}
                        {anniversaries.length > 0 && (
                          <PartyPopper className="h-3.5 w-3.5 text-gold" aria-label="Anniversary" />
                        )}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={`${dateKey}-${event.id}`}
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            void openBookingDetails(event);
                          }}
                          className={cn(
                            'rounded-md border px-2 py-1 text-[11px] leading-tight',
                            getStatusStyles(event.statusCode),
                          )}
                        >
                          <p className="truncate font-semibold">{event.clientName}</p>
                          <p className="truncate opacity-80">{event.eventType}</p>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <p className="text-[10px] text-gray-500">+{dayEvents.length - 2} more</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-display text-lg font-semibold text-gold">Upcoming Bookings</h3>
          <p className="mt-1 text-sm text-gray-500">Next scheduled studio events.</p>

          {upcomingQuery.isLoading ? (
            <p className="mt-6 text-sm text-gray-500">Loading upcoming bookings...</p>
          ) : upcomingBookings.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">No upcoming bookings scheduled.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {upcomingBookings.map((booking) => (
                <button
                  key={booking.id}
                  type="button"
                  onClick={() => {
                    setViewBooking(booking);
                    setSelectedDay(null);
                  }}
                  className="w-full rounded-lg border border-surface-border bg-surface-elevated p-4 text-left transition hover:border-gold/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-100">{booking.client.fullName}</p>
                      <p className="text-xs text-gray-500">{booking.bookingNumber}</p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-[10px] font-medium',
                        getStatusStyles(booking.statusCode),
                      )}
                    >
                      {getStatusLabel(booking.statusCode, booking.status)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <p>{formatDate(booking.eventDate)}</p>
                    <p>{booking.eventType}</p>
                    <p className="col-span-2">{booking.venue || 'Venue TBD'}</p>
                    <p className="text-gold">{formatCurrency(booking.totalAmount)}</p>
                    <p>Balance {formatCurrency(booking.balanceAmount)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-md">
            <h3 className="font-display text-lg font-semibold text-gold">
              {formatDate(selectedDay)}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {(eventsByDate.get(selectedDay) ?? []).length > 0
                ? `${(eventsByDate.get(selectedDay) ?? []).length} booking(s) on this date.`
                : 'No bookings on this date yet.'}
            </p>

            <div className="mt-4 space-y-2">
              {(eventsByDate.get(selectedDay) ?? []).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => void openBookingDetails(event)}
                  className={cn(
                    'w-full rounded-lg border px-4 py-3 text-left',
                    getStatusStyles(event.statusCode),
                  )}
                >
                  <p className="font-medium">{event.clientName}</p>
                  <p className="text-xs opacity-80">
                    {event.bookingNumber} · {event.eventType}
                  </p>
                </button>
              ))}
              {(clientMarkersByDate.get(selectedDay) ?? []).map((marker) => (
                <div
                  key={`${marker.clientId}-${marker.type}`}
                  className="rounded-lg border border-surface-border bg-surface-elevated px-4 py-3"
                >
                  <p className="font-medium text-gray-100">{marker.clientName}</p>
                  <p className="text-xs text-gray-400">
                    {marker.type === 'birthday' ? 'Birthday' : 'Anniversary'}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setSelectedDay(null)}>
                Close
              </button>
              {canCreate && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => openCreateForDate(selectedDay)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Booking
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <BookingViewModal
        open={Boolean(viewBooking)}
        booking={viewBooking}
        canEdit={canUpdate}
        onClose={() => setViewBooking(null)}
        onEdit={(booking) => {
          setViewBooking(null);
          setFormMode('edit');
          setEditBooking(booking);
          setFormOpen(true);
        }}
      />

      <BookingFormModal
        open={formOpen}
        mode={formMode}
        booking={editBooking}
        prefillDate={prefillDate}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        serviceRates={serviceRatesQuery.data ?? []}
        onClose={() => {
          setFormOpen(false);
          setPrefillDate('');
          setEditBooking(null);
        }}
        onSubmit={(data: BookingFormData) => {
          if (formMode === 'create') {
            createMutation.mutate(data);
            return;
          }
          if (editBooking) {
            updateMutation.mutate({ id: editBooking.id, data });
          }
        }}
      />
    </div>
  );
}
