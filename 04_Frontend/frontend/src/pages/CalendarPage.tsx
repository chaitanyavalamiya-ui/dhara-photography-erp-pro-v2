/**
 * FINAL LOCKED CALENDAR MODULE — DO NOT MODIFY WITHOUT EXPLICIT USER APPROVAL
 *
 * This file is the approved Calendar baseline. Do not change markup, copy,
 * layout, styling hooks, icons, or calendar behavior unless the user explicitly
 * requests a specific Calendar change.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Cake, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Heart, IndianRupee, Plus, Sparkles, Wallet } from 'lucide-react';
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
import { CalendarGlyph, calendarEventGlyph, calendarEventTone } from '@/components/calendar/calendar-glyphs';
import {
  CALENDAR_MONTHS,
  buildMonthSummary,
  isCalendarBookingStartDate,
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
import './calendar/calendar-page.css';

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
  const monthMarkerCounts = useMemo(() => {
    let birthdays = 0;
    let anniversaries = 0;
    for (const [dateKey, markers] of clientMarkersByDate) {
      if (dateKey < monthRange.dateFrom || dateKey > monthRange.dateTo) continue;
      for (const marker of markers) {
        if (marker.type === 'birthday') birthdays += 1;
        if (marker.type === 'anniversary') anniversaries += 1;
      }
    }
    return { birthdays, anniversaries };
  }, [clientMarkersByDate, monthRange.dateFrom, monthRange.dateTo]);

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

  const kpis = [
    { label: 'Total Bookings', value: summary.totalBookings, tone: 'is-gold', icon: ClipboardList },
    { label: 'Confirmed', value: summary.confirmed, tone: 'is-cyan', icon: CheckCircle2 },
    { label: 'Pending', value: summary.pending, tone: 'is-amber', icon: AlertCircle },
    { label: 'Completed', value: summary.completed, tone: 'is-magenta', icon: Sparkles },
    { label: 'Cancelled', value: cancelledCount, tone: 'is-rose', icon: CalendarDays },
    { label: 'Total Amount', value: formatCurrency(summary.totalAmount), tone: 'is-gold', icon: IndianRupee },
    { label: 'Outstanding', value: formatCurrency(summary.outstandingBalance), tone: 'is-amber', icon: Wallet },
    { label: 'Birthdays', value: monthMarkerCounts.birthdays, tone: 'is-rose', icon: Cake },
    { label: 'Anniversaries', value: monthMarkerCounts.anniversaries, tone: 'is-purple', icon: Heart },
  ] as const;

  return (
    <div className="dhara-calendar">
      <section className="dhara-cal-hero">
        <div>
          <p className="dhara-cal-kicker">DHARA PHOTOGRAPHY ERP PRO</p>
          <h2>Calendar</h2>
          <p className="dhara-cal-hero-copy">
            તમારી દરેક યાદગાર તારીખ, ઇવેન્ટ અને સ્ટુડિયો બુકિંગનું સંપૂર્ણ દર્શન.
          </p>
        </div>
        <div className="dhara-cal-hero-art" aria-hidden>
          <svg viewBox="0 0 120 120" fill="none">
            <rect x="18" y="22" width="84" height="80" rx="12" stroke="#ffd45a" strokeWidth="2.2" />
            <path d="M18 44h84" stroke="#ff4ec8" strokeWidth="1.6" />
            <circle cx="38" cy="34" r="5" fill="#22d3ee" />
            <circle cx="54" cy="34" r="5" fill="#c084fc" />
            <circle cx="70" cy="34" r="5" fill="#ffd45a" />
            <rect x="32" y="56" width="16" height="14" rx="4" fill="rgba(255,212,90,0.28)" stroke="#ffd45a" />
            <rect x="52" y="56" width="16" height="14" rx="4" fill="rgba(255,78,200,0.22)" stroke="#ff4ec8" />
            <rect x="72" y="56" width="16" height="14" rx="4" fill="rgba(34,211,238,0.22)" stroke="#22d3ee" />
            <path d="M40 88h40" stroke="#ffe7b8" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </section>

      <div className="dhara-cal-panel dhara-cal-toolbar">
        <h3 className="dhara-cal-month-title">{monthRange.label}</h3>
        <div className="dhara-cal-nav">
          <button type="button" className="dhara-cal-btn is-gold" onClick={goToToday}>
            Today
          </button>
          <button
            type="button"
            aria-label="Previous month"
            className="dhara-cal-btn is-cyan"
            onClick={() => goToMonth(-1)}
          >
            <ChevronLeft strokeWidth={2.5} absoluteStrokeWidth />
          </button>
          <select
            id="calendar-month"
            aria-label="Month"
            className="dhara-cal-select"
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
            className="dhara-cal-select is-year"
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
            className="dhara-cal-btn is-cyan"
            onClick={() => goToMonth(1)}
          >
            <ChevronRight strokeWidth={2.5} absoluteStrokeWidth />
          </button>
        </div>
      </div>

      {feedback && (
        <div className={cn('dhara-cal-flash', feedback.type === 'success' ? 'is-ok' : 'is-bad')}>
          {feedback.message}
        </div>
      )}

      <div className="dhara-cal-kpis">
        {kpis.map((kpi) => (
          <article key={kpi.label} className={cn('dhara-cal-kpi', kpi.tone)}>
            <div className="dhara-cal-kpi-top">
              <h3>{kpi.label}</h3>
              <span className="dhara-cal-icon">
                <kpi.icon strokeWidth={2.35} absoluteStrokeWidth />
              </span>
            </div>
            <strong>{kpi.value}</strong>
          </article>
        ))}
      </div>

      <div className="dhara-cal-body">
        <div className="dhara-cal-panel dhara-cal-board">
          <div className="dhara-cal-week">
            {WEEKDAYS.map((day) => (
              <div key={day} className="dhara-cal-wd">
                {day}
              </div>
            ))}
          </div>

          {calendarQuery.isLoading ? (
            <div className="dhara-cal-loading">Loading calendar...</div>
          ) : calendarQuery.isError ? (
            <div className="dhara-cal-loading" style={{ color: '#fecaca' }}>
              Failed to load calendar bookings.
            </div>
          ) : (
            <div className="dhara-cal-grid">
              {gridDays.map((date) => {
                const dateKey = toDateKey(date);
                const dayEvents = eventsByDate.get(dateKey) ?? [];
                const dayStartEvents = dayEvents.filter((event) =>
                  isCalendarBookingStartDate(event, dateKey),
                );
                const clientMarkers = clientMarkersByDate.get(dateKey) ?? [];
                const inMonth = isSameMonth(date, year, month);
                const today = isToday(date);
                const hasBooking = dayEvents.length > 0;
                const hasWedding = dayEvents.some((event) => isWeddingEventType(event.eventType));
                const hasEngagement = dayEvents.some((event) => event.eventType === 'Engagement');
                const birthdays = clientMarkers.filter((marker) => marker.type === 'birthday');
                const anniversaries = clientMarkers.filter((marker) => marker.type === 'anniversary');

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setSelectedDay(dateKey)}
                    className={cn(
                      'dhara-cal-day',
                      !inMonth && 'is-out',
                      today && 'is-today',
                      hasBooking && inMonth && 'is-booked',
                    )}
                  >
                    <div className="dhara-cal-day-top">
                      <span className="dhara-cal-num">
                        {date.getDate()}
                        {today ? <span className="dhara-cal-today-tag">TODAY</span> : null}
                      </span>
                      <span
                        className="dhara-cal-marks"
                        aria-hidden={!hasBooking && clientMarkers.length === 0}
                      >
                        {hasBooking && (
                          <span className="dhara-cal-mark is-booked">
                            <CalendarGlyph kind="booked" label="Booked" />
                          </span>
                        )}
                        {hasWedding && (
                          <span className="dhara-cal-mark is-wedding">
                            <CalendarGlyph kind="wedding" label="Wedding" />
                          </span>
                        )}
                        {hasEngagement && (
                          <span className="dhara-cal-mark is-engagement">
                            <CalendarGlyph kind="engagement" label="Engagement" />
                          </span>
                        )}
                        {birthdays.length > 0 && (
                          <span className="dhara-cal-mark is-bday">
                            <CalendarGlyph kind="birthday" label="Birthday" />
                          </span>
                        )}
                        {anniversaries.length > 0 && (
                          <span className="dhara-cal-mark is-anniv">
                            <CalendarGlyph kind="anniversary" label="Anniversary" />
                          </span>
                        )}
                      </span>
                    </div>

                    <div>
                      {dayStartEvents.slice(0, 2).map((event) => (
                          <div
                            key={`${dateKey}-${event.id}`}
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              void openBookingDetails(event);
                            }}
                            className={cn('dhara-cal-chip', calendarEventTone(event.eventType))}
                          >
                            <span className="dhara-cal-chip-icon">
                              <CalendarGlyph kind={calendarEventGlyph(event.eventType)} />
                            </span>
                            <span className="dhara-cal-chip-copy">
                              <p className="truncate">{event.clientName}</p>
                              <small className="truncate">{event.eventType}</small>
                            </span>
                          </div>
                        ))}
                      {dayStartEvents.length > 2 && (
                        <p className="dhara-cal-more">+{dayStartEvents.length - 2} more</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="dhara-cal-legend" aria-label="Calendar icon guide">
            <span className="dhara-cal-legend-item is-wedding">
              <span className="dhara-cal-mark is-wedding">
                <CalendarGlyph kind="wedding" />
              </span>
              Wedding
            </span>
            <span className="dhara-cal-legend-item is-bday">
              <span className="dhara-cal-mark is-bday">
                <CalendarGlyph kind="birthday" />
              </span>
              Birthdays
            </span>
            <span className="dhara-cal-legend-item is-anniv">
              <span className="dhara-cal-mark is-anniv">
                <CalendarGlyph kind="anniversary" />
              </span>
              Anniversaries
            </span>
            <span className="dhara-cal-legend-item is-engagement">
              <span className="dhara-cal-mark is-engagement">
                <CalendarGlyph kind="engagement" />
              </span>
              Engagement
            </span>
            <span className="dhara-cal-legend-item is-other">
              <span className="dhara-cal-mark is-other">
                <CalendarGlyph kind="other" />
              </span>
              Other
            </span>
          </div>
        </div>

        <div className="dhara-cal-panel dhara-cal-side">
          <h3>Upcoming Bookings</h3>
          <p>Next scheduled studio events.</p>

          {upcomingQuery.isLoading ? (
            <p className="mt-6 text-[1.02rem] text-[#ffe7b8]">Loading upcoming bookings...</p>
          ) : upcomingBookings.length === 0 ? (
            <p className="mt-6 text-[1.02rem] text-[#ffe7b8]">No upcoming bookings scheduled.</p>
          ) : (
            upcomingBookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                onClick={() => {
                  setViewBooking(booking);
                  setSelectedDay(null);
                }}
                className="dhara-cal-up-item"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p>{booking.client.fullName}</p>
                    <small>{booking.bookingNumber}</small>
                  </div>
                  <span className={cn('dhara-cal-status', getStatusStyles(booking.statusCode))}>
                    {getStatusLabel(booking.statusCode, booking.status)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[0.95rem] text-[#ffe7b8]">
                  <p>{formatDate(booking.eventDate)}</p>
                  <p>{booking.eventType}</p>
                  <p className="col-span-2">{booking.venue || 'Venue TBD'}</p>
                  <p className="text-[#ffd45a]">{formatCurrency(booking.totalAmount)}</p>
                  <p>Balance {formatCurrency(booking.balanceAmount)}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedDay && (
        <div className="dhara-cal-modal">
          <div className="dhara-cal-modal-card">
            <h3>{formatDate(selectedDay)}</h3>
            <p className="mt-1 text-[1.02rem] text-[#ffe7b8]">
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
                  className={cn('w-full rounded-lg border px-4 py-3 text-left', getStatusStyles(event.statusCode))}
                >
                  <p className="font-medium">{event.clientName}</p>
                  <p className="text-[1.02rem] text-[#fff1c9]">
                    {event.bookingNumber} · {event.eventType}
                  </p>
                </button>
              ))}
              {(clientMarkersByDate.get(selectedDay) ?? []).map((marker) => (
                <div
                  key={`${marker.clientId}-${marker.type}`}
                  className="rounded-lg border border-[rgba(255,212,90,0.22)] bg-[rgba(255,255,255,0.04)] px-4 py-3"
                >
                  <p className="font-medium text-[#fffdf8]">{marker.clientName}</p>
                  <p className="text-[0.95rem] text-[#ffe7b8]">
                    {marker.type === 'birthday' ? 'Birthday' : 'Anniversary'}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="dhara-cal-btn" onClick={() => setSelectedDay(null)}>
                Close
              </button>
              {canCreate && (
                <button
                  type="button"
                  className="dhara-cal-btn is-gold"
                  onClick={() => openCreateForDate(selectedDay)}
                >
                  <Plus strokeWidth={2.5} absoluteStrokeWidth />
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
