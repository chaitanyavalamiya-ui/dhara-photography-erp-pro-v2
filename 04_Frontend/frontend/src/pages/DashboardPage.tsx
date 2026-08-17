import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookImage,
  BookOpen,
  CalendarDays,
  Camera,
  Gift,
  Image,
  LayoutDashboard,
  Package,
  Plus,
  Receipt,
  Settings,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { accountsService } from '@/services/accounts-service';
import { reportsService } from '@/services/reports-service';
import { bookingsService } from '@/services/bookings-service';
import { clientsService } from '@/services/clients-service';
import { deliveriesService, DeliveryItem } from '@/services/deliveries-service';
import { invoicesService } from '@/services/invoices-service';
import { useAuthStore } from '@/stores/auth-store';
import { ReportChartsSection } from '@/components/reports/ReportChartsSection';
import { formatCurrency, formatDate } from '@/utils/booking-form';
import { todayIso } from '@/utils/studio-date';
import { cn } from '@/utils/cn';

function LoadingCard({ className }: { className?: string }) {
  return <div className={cn('card animate-pulse bg-surface-elevated', className)} />;
}

function EmptyPanel({
  message,
  icon: Icon = LayoutDashboard,
}: {
  message: string;
  icon?: typeof LayoutDashboard;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          border: '1px solid var(--dhara-border)',
          color: 'var(--dhara-accent)',
          background: 'color-mix(in srgb, var(--dhara-accent) 10%, transparent)',
        }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p
        className="max-w-sm text-sm leading-relaxed"
        style={{ color: 'var(--dhara-text-secondary)' }}
      >
        {message}
      </p>
    </div>
  );
}

function deliveryStatusClass(status: string) {
  switch (status) {
    case 'ready':
      return 'status-badge status-badge-ok';
    case 'pending':
      return 'status-badge status-badge-warn';
    default:
      return 'status-badge';
  }
}

function bookingStatusClass(statusCode: string) {
  switch (statusCode) {
    case 'confirmed':
    case 'completed':
      return 'status-badge status-badge-ok';
    case 'enquiry':
      return 'status-badge status-badge-warn';
    case 'cancelled':
      return 'status-badge status-badge-danger status-badge-cancelled';
    default:
      return 'status-badge';
  }
}

function invoiceStatusClass(status: string) {
  switch (status) {
    case 'paid':
      return 'status-badge status-badge-ok';
    case 'partially_paid':
      return 'status-badge status-badge-warn status-badge-partial';
    case 'unpaid':
      return 'status-badge status-badge-warn status-badge-unpaid';
    case 'overdue':
      return 'status-badge status-badge-danger';
    default:
      return 'status-badge';
  }
}

function sortUpcomingDeliveries(items: DeliveryItem[]) {
  return [...items].sort((a, b) => {
    if (!a.expectedDate && !b.expectedDate) return 0;
    if (!a.expectedDate) return 1;
    if (!b.expectedDate) return -1;
    return a.expectedDate.localeCompare(b.expectedDate);
  });
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const canAccounts = hasPermission('accounts.read');
  const canReports = hasPermission('reports.read');
  const canBookings = hasPermission('bookings.read');
  const canClients = hasPermission('clients.read');
  const canDeliveries = hasPermission('delivery.read');
  const canInvoices = hasPermission('invoices.read');
  const canCreateBooking = hasPermission('bookings.create');
  const canCreatePayment = hasPermission('payments.create');
  const canCreateExpense = hasPermission('expenses.create');
  const canGallery = hasPermission('gallery.read');
  const canAlbums = hasPermission('album.read');
  const canSettings = hasPermission('settings.read');

  const today = todayIso();
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  const accountsDashboardQuery = useQuery({
    queryKey: ['accounts', 'dashboard'],
    queryFn: accountsService.getDashboard,
    enabled: canAccounts,
  });

  const monthSummaryQuery = useQuery({
    queryKey: ['accounts', 'summary', 'this_month'],
    queryFn: () => accountsService.getPeriodSummary({ preset: 'this_month' }),
    enabled: canAccounts,
  });

  const reportsDashboardQuery = useQuery({
    queryKey: ['reports', 'dashboard', 'this_month'],
    queryFn: () => reportsService.getDashboard({ preset: 'this_month' }),
    enabled: canReports,
  });

  const chartsQuery = useQuery({
    queryKey: ['reports', 'charts', 'this_month'],
    queryFn: () => reportsService.getCharts({ preset: 'this_month' }),
    enabled: canReports,
  });

  const todayBookingsQuery = useQuery({
    queryKey: ['bookings', 'calendar', today],
    queryFn: () => bookingsService.getCalendar({ dateFrom: today, dateTo: today }),
    enabled: canBookings,
  });

  const recentBookingsQuery = useQuery({
    queryKey: ['bookings', 'dashboard', 'recent'],
    queryFn: () => bookingsService.list({ limit: 6, sortBy: 'eventDate', sortOrder: 'desc' }),
    enabled: canBookings,
  });

  const recentInvoicesQuery = useQuery({
    queryKey: ['invoices', 'dashboard', 'recent'],
    queryFn: () => invoicesService.list({ limit: 5, sortBy: 'invoiceDate', sortOrder: 'desc' }),
    enabled: canInvoices,
  });

  const upcomingEventsQuery = useQuery({
    queryKey: ['clients', 'upcoming-events'],
    queryFn: clientsService.getUpcomingEvents,
    enabled: canClients,
  });

  const upcomingDeliveriesQuery = useQuery({
    queryKey: ['deliveries', 'dashboard', 'upcoming'],
    queryFn: async () => {
      const [pending, ready] = await Promise.all([
        deliveriesService.list({
          status: 'pending',
          sortBy: 'expectedDate',
          sortOrder: 'asc',
          limit: 10,
        }),
        deliveriesService.list({
          status: 'ready',
          sortBy: 'expectedDate',
          sortOrder: 'asc',
          limit: 10,
        }),
      ]);

      return sortUpcomingDeliveries([...pending.items, ...ready.items]).slice(0, 6);
    },
    enabled: canDeliveries,
  });

  const recentIncomeQuery = useQuery({
    queryKey: ['accounts', 'income', 'dashboard'],
    queryFn: () => accountsService.getIncome({ preset: 'this_month', limit: 5 }),
    enabled: canAccounts,
  });

  const allTime = accountsDashboardQuery.data;
  const month = monthSummaryQuery.data;
  const reportsMonth = reportsDashboardQuery.data;

  const kpiCards = useMemo(() => {
    const cards: {
      label: string;
      value: string;
      sub: string;
      icon: typeof Wallet;
      roboTarget?: string;
    }[] = [];

    if (canBookings) {
      cards.push({
        label: "Today's Bookings",
        value: String(todayBookingsQuery.data?.length ?? (todayBookingsQuery.isLoading ? '—' : 0)),
        sub: 'Shoots scheduled today',
        icon: Camera,
        roboTarget: 'today-bookings',
      });
    }

    if (canClients) {
      cards.push({
        label: "Today's Events",
        value: String(
          upcomingEventsQuery.data?.filter((event) => event.daysUntil === 0).length ??
            (upcomingEventsQuery.isLoading ? '—' : 0),
        ),
        sub: 'Birthdays and anniversaries',
        icon: Gift,
      });
    }

    if (canAccounts && allTime) {
      cards.push(
        {
          label: 'Cash Received',
          value: formatCurrency(allTime.amountReceived),
          sub: 'All-time collections',
          icon: ArrowDownLeft,
          roboTarget: 'cash-received',
        },
        {
          label: 'Outstanding',
          value: formatCurrency(allTime.outstandingAmount),
          sub: 'Pending client balances',
          icon: Wallet,
        },
        {
          label: 'Net Profit',
          value: formatCurrency(allTime.netProfit),
          sub: 'Cash received − expenses',
          icon: TrendingUp,
        },
      );
    }

    if (canReports && reportsMonth) {
      cards.push({
        label: 'This Month Bookings',
        value: String(reportsMonth.bookingsCount),
        sub: `${reportsMonth.unpaidInvoicesCount} unpaid invoices`,
        icon: CalendarDays,
      });
    } else if (canAccounts && month) {
      cards.push({
        label: 'This Month Bookings',
        value: String(month.bookingsCount),
        sub: month.period.label,
        icon: CalendarDays,
      });
    }

    if (canAccounts && month) {
      cards.push({
        label: 'Month Expenses',
        value: formatCurrency(month.totalExpenses),
        sub: `Profit ${formatCurrency(month.netProfit)}`,
        icon: ArrowUpRight,
      });
    }

    return cards.slice(0, 6);
  }, [
    allTime,
    month,
    reportsMonth,
    canAccounts,
    canReports,
    canBookings,
    canClients,
    todayBookingsQuery.data,
    todayBookingsQuery.isLoading,
    upcomingEventsQuery.data,
    upcomingEventsQuery.isLoading,
  ]);

  const quickActions = [
    canCreateBooking && { label: 'New Booking', to: '/bookings', icon: CalendarDays },
    canCreatePayment && { label: 'Record Payment', to: '/accounts', icon: ArrowDownLeft },
    canCreateExpense && { label: 'Add Expense', to: '/expenses', icon: Receipt },
    canReports && { label: 'Open Reports', to: '/reports', icon: TrendingUp },
  ].filter(Boolean) as { label: string; to: string; icon: typeof Plus }[];

  const studioShortcuts = [
    canClients && { label: 'Clients', to: '/clients', icon: Users },
    canBookings && { label: 'Calendar', to: '/calendar', icon: CalendarDays },
    canGallery && { label: 'Gallery', to: '/gallery', icon: Image },
    canAlbums && { label: 'Albums', to: '/albums', icon: BookImage },
    canInvoices && { label: 'Invoices', to: '/invoices', icon: Receipt },
    canDeliveries && { label: 'Delivery', to: '/deliveries', icon: Package },
    canSettings && { label: 'Settings', to: '/settings', icon: Settings },
  ].filter(Boolean) as { label: string; to: string; icon: typeof Plus }[];

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden dhara-hero">
        <div className="relative z-10 max-w-3xl">
          <p className="dhara-section-kicker" style={{ color: 'var(--dhara-accent)' }}>
            Dhara Photography — Royal Cinematic Studio ERP
          </p>
          <h2 className="mt-3 font-display text-5xl font-semibold leading-tight sm:text-6xl">
            Welcome, {firstName}
          </h2>
          <p
            className="font-gujarati mt-4 text-2xl sm:text-3xl"
            style={{ color: 'var(--dhara-accent-soft)' }}
          >
            ધારા ફોટોગ્રાફી પાટણમાં આપનું સ્વાગત છે
          </p>
          <p
            className="mt-4 max-w-xl text-base leading-relaxed"
            style={{ color: 'var(--dhara-text-secondary)' }}
          >
            Luxury wedding studio command center — bookings, clients, invoices, and accounts in one
            cinematic workspace.
          </p>
        </div>
      </section>

      {(canAccounts || canReports || canBookings) && (
        <div>
          <p className="dhara-section-kicker mb-3">Studio Snapshot</p>
          {accountsDashboardQuery.isLoading && reportsDashboardQuery.isLoading && canAccounts ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <LoadingCard key={i} className="h-32" />
              ))}
            </div>
          ) : kpiCards.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {kpiCards.map((card) => (
                <div key={card.label} className="card dhara-kpi" data-robo-target={card.roboTarget}>
                  <div className="flex items-start justify-between">
                    <p className="dhara-kpi-label">{card.label}</p>
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{
                        border: '1px solid var(--dhara-border)',
                        background: 'color-mix(in srgb, var(--dhara-accent) 12%, transparent)',
                      }}
                    >
                      <card.icon className="h-4 w-4" style={{ color: 'var(--dhara-accent)' }} />
                    </div>
                  </div>
                  <p
                    className="font-display mt-4 text-4xl font-semibold leading-none"
                    style={{ color: 'var(--dhara-text-primary)' }}
                  >
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm" style={{ color: 'var(--dhara-text-secondary)' }}>
                    {card.sub}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel message="Financial summary will appear once accounts data is available." />
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
        <div className="space-y-6">
          {canBookings && (
            <div className="card dhara-recent-bookings overflow-hidden p-0">
              <div className="flex items-center justify-between px-6 pt-6">
                <h3
                  className="font-display text-2xl font-semibold"
                  style={{ color: 'var(--dhara-accent-soft)' }}
                >
                  Recent Bookings
                </h3>
                <Link
                  to="/bookings"
                  className="text-sm hover:underline"
                  style={{ color: 'var(--dhara-accent)' }}
                >
                  View bookings →
                </Link>
              </div>
              {recentBookingsQuery.isLoading ? (
                <LoadingCard className="m-6 h-40" />
              ) : (recentBookingsQuery.data?.items.length ?? 0) === 0 ? (
                <EmptyPanel message="No bookings yet." icon={BookOpen} />
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="dhara-table">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Event</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookingsQuery.data?.items.map((booking) => (
                        <tr key={booking.id}>
                          <td>
                            <p className="font-medium">
                              {booking.client?.fullName ?? booking.bookingNumber}
                            </p>
                            <p className="text-sm" style={{ color: 'var(--dhara-text-secondary)' }}>
                              {booking.bookingNumber}
                            </p>
                          </td>
                          <td>{booking.eventType}</td>
                          <td>{booking.eventDate ? formatDate(booking.eventDate) : '—'}</td>
                          <td>
                            <span className={bookingStatusClass(booking.statusCode)}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="text-right font-semibold">
                            {formatCurrency(booking.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <h3
                  className="font-display text-xl font-semibold"
                  style={{ color: 'var(--dhara-accent-soft)' }}
                >
                  Today&apos;s Shoots
                </h3>
                {canBookings && (
                  <Link
                    to="/calendar"
                    className="text-sm hover:underline"
                    style={{ color: 'var(--dhara-accent)' }}
                  >
                    Open calendar →
                  </Link>
                )}
              </div>
              {!canBookings ? (
                <EmptyPanel message="You do not have permission to view bookings." />
              ) : todayBookingsQuery.isLoading ? (
                <LoadingCard className="h-40" />
              ) : (todayBookingsQuery.data?.length ?? 0) === 0 ? (
                <EmptyPanel message="No bookings scheduled for today." icon={Camera} />
              ) : (
                <div className="space-y-2">
                  {todayBookingsQuery.data?.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between rounded-lg px-3 py-3 text-sm"
                      style={{ border: '1px solid var(--dhara-border)' }}
                    >
                      <div>
                        <p className="font-medium">
                          {booking.bookingNumber} · {booking.eventType}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--dhara-text-secondary)' }}>
                          {booking.clientName}
                          {booking.venue ? ` · ${booking.venue}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className="text-sm capitalize"
                          style={{ color: 'var(--dhara-text-secondary)' }}
                        >
                          {booking.status}
                        </p>
                        <p className="font-semibold" style={{ color: 'var(--dhara-accent)' }}>
                          {formatCurrency(booking.totalAmount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {canAccounts && (
              <div className="card">
                <div className="mb-4 flex items-center justify-between">
                  <h3
                    className="font-display text-xl font-semibold"
                    style={{ color: 'var(--dhara-accent-soft)' }}
                  >
                    Recent Payments
                  </h3>
                  <Link
                    to="/accounts"
                    className="text-sm hover:underline"
                    style={{ color: 'var(--dhara-accent)' }}
                  >
                    View accounts →
                  </Link>
                </div>
                {recentIncomeQuery.isLoading ? (
                  <LoadingCard className="h-32" />
                ) : (recentIncomeQuery.data?.items.length ?? 0) === 0 ? (
                  <EmptyPanel message="No payments recorded this month." />
                ) : (
                  <div className="space-y-2">
                    {recentIncomeQuery.data?.items.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                        style={{ border: '1px solid var(--dhara-border)' }}
                      >
                        <div>
                          <p>{payment.clientName}</p>
                          <p className="text-sm" style={{ color: 'var(--dhara-text-secondary)' }}>
                            {payment.receiptNumber} · {payment.paymentDate}
                          </p>
                        </div>
                        <p className="font-semibold" style={{ color: 'var(--dhara-success)' }}>
                          {formatCurrency(payment.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {canReports && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="dhara-section-kicker">Revenue Overview · Income vs Expenses</p>
                <Link
                  to="/reports"
                  className="text-sm hover:underline"
                  style={{ color: 'var(--dhara-accent)' }}
                >
                  Full reports →
                </Link>
              </div>
              <ReportChartsSection charts={chartsQuery.data} loading={chartsQuery.isLoading} />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h3
                className="font-display text-xl font-semibold"
                style={{ color: 'var(--dhara-accent-soft)' }}
              >
                Today&apos;s Events
              </h3>
              {canClients && (
                <Link
                  to="/clients"
                  className="text-sm hover:underline"
                  style={{ color: 'var(--dhara-accent)' }}
                >
                  View clients →
                </Link>
              )}
            </div>
            {!canClients ? (
              <EmptyPanel message="You do not have permission to view client events." />
            ) : upcomingEventsQuery.isLoading ? (
              <LoadingCard className="h-40" />
            ) : (upcomingEventsQuery.data?.length ?? 0) === 0 ? (
              <EmptyPanel
                message="No upcoming birthdays or anniversaries in the next 30 days."
                icon={Gift}
              />
            ) : (
              <div className="space-y-2">
                {upcomingEventsQuery.data?.slice(0, 6).map((event) => (
                  <div
                    key={`${event.clientId}-${event.eventType}-${event.eventDate}`}
                    className="flex items-center justify-between rounded-lg px-3 py-3 text-sm"
                    style={{ border: '1px solid var(--dhara-border)' }}
                  >
                    <div className="flex items-center gap-3">
                      <Gift className="h-4 w-4" style={{ color: 'var(--dhara-accent)' }} />
                      <div>
                        <p className="font-medium">{event.clientName}</p>
                        <p
                          className="text-sm capitalize"
                          style={{ color: 'var(--dhara-text-secondary)' }}
                        >
                          {event.eventType} · {formatDate(event.eventDate)}
                        </p>
                      </div>
                    </div>
                    <span className="status-badge">
                      {event.daysUntil === 0 ? 'Today' : `${event.daysUntil}d`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {quickActions.length > 0 && (
            <div className="card">
              <h3
                className="mb-4 font-display text-xl font-semibold"
                style={{ color: 'var(--dhara-accent-soft)' }}
              >
                Quick Actions
              </h3>
              <div className="dhara-quick-actions-grid grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    to={action.to}
                    className="btn-secondary dhara-studio-control dhara-card-hover"
                  >
                    <action.icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {studioShortcuts.length > 0 && (
            <div className="card">
              <h3
                className="mb-4 font-display text-xl font-semibold"
                style={{ color: 'var(--dhara-accent-soft)' }}
              >
                Studio Shortcuts
              </h3>
              <div className="dhara-studio-shortcuts grid grid-cols-2 gap-3">
                {studioShortcuts.map((action) => (
                  <Link
                    key={action.label}
                    to={action.to}
                    className="dhara-card-hover dhara-shortcut-tile flex flex-col items-center justify-center gap-2 rounded-xl px-3 py-4"
                    style={{
                      border: '1px solid var(--dhara-border)',
                      background: 'color-mix(in srgb, var(--dhara-surface) 80%, transparent)',
                    }}
                  >
                    <action.icon className="h-5 w-5" style={{ color: 'var(--dhara-accent)' }} />
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {canInvoices && (
            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <h3
                  className="font-display text-xl font-semibold"
                  style={{ color: 'var(--dhara-accent-soft)' }}
                >
                  Recent Invoices
                </h3>
                <Link
                  to="/invoices"
                  className="text-sm hover:underline"
                  style={{ color: 'var(--dhara-accent)' }}
                >
                  View invoices →
                </Link>
              </div>
              {recentInvoicesQuery.isLoading ? (
                <LoadingCard className="h-32" />
              ) : (recentInvoicesQuery.data?.items.length ?? 0) === 0 ? (
                <EmptyPanel message="No invoices yet." />
              ) : (
                <div className="space-y-2">
                  {recentInvoicesQuery.data?.items.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                      style={{ border: '1px solid var(--dhara-border)' }}
                    >
                      <div>
                        <p className="font-medium">{invoice.clientName}</p>
                        <p className="text-sm" style={{ color: 'var(--dhara-text-secondary)' }}>
                          {invoice.invoiceNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={invoiceStatusClass(invoice.status)}>
                          {invoice.status.replace('_', ' ')}
                        </span>
                        <p className="mt-1 font-semibold">{formatCurrency(invoice.totalAmount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {canDeliveries && (
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3
              className="font-display text-xl font-semibold"
              style={{ color: 'var(--dhara-accent-soft)' }}
            >
              Upcoming / Pending Deliveries
            </h3>
            <Link
              to="/deliveries"
              className="text-sm hover:underline"
              style={{ color: 'var(--dhara-accent)' }}
            >
              View deliveries →
            </Link>
          </div>
          {upcomingDeliveriesQuery.isLoading ? (
            <LoadingCard className="h-40" />
          ) : upcomingDeliveriesQuery.isError ? (
            <div
              className="rounded-lg border px-4 py-6 text-center text-sm"
              style={{ borderColor: 'var(--dhara-danger)', color: 'var(--dhara-danger)' }}
            >
              Failed to load deliveries.
            </div>
          ) : (upcomingDeliveriesQuery.data?.length ?? 0) === 0 ? (
            <EmptyPanel message="No pending or ready deliveries right now." />
          ) : (
            <div className="space-y-2">
              {upcomingDeliveriesQuery.data?.map((delivery) => (
                <Link
                  key={delivery.id}
                  to="/deliveries"
                  className="dhara-card-hover flex items-center justify-between rounded-lg px-3 py-3 text-sm"
                  style={{ border: '1px solid var(--dhara-border)' }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Package
                      className="h-4 w-4 shrink-0"
                      style={{ color: 'var(--dhara-accent)' }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {delivery.clientName} · {delivery.bookingNumber}
                      </p>
                      <p
                        className="truncate text-sm"
                        style={{ color: 'var(--dhara-text-secondary)' }}
                      >
                        {delivery.deliverableTypeLabel}
                        {delivery.title ? ` · ${delivery.title}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <span className={deliveryStatusClass(delivery.status)}>
                      {delivery.statusLabel}
                    </span>
                    <p className="mt-1 text-sm" style={{ color: 'var(--dhara-text-secondary)' }}>
                      {delivery.expectedDate ? formatDate(delivery.expectedDate) : 'No date'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
