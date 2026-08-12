import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Camera,
  Gift,
  LayoutDashboard,
  Package,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { accountsService } from '@/services/accounts-service';
import { reportsService } from '@/services/reports-service';
import { bookingsService } from '@/services/bookings-service';
import { clientsService } from '@/services/clients-service';
import { deliveriesService, DeliveryItem } from '@/services/deliveries-service';
import { useAuthStore } from '@/stores/auth-store';
import { ReportChartsSection } from '@/components/reports/ReportChartsSection';
import { formatCurrency, formatDate } from '@/utils/booking-form';
import { cn } from '@/utils/cn';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function LoadingCard({ className }: { className?: string }) {
  return <div className={cn('card animate-pulse bg-surface-elevated', className)} />;
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <LayoutDashboard className="mb-3 h-8 w-8 text-gray-600" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

function deliveryStatusClass(status: string) {
  switch (status) {
    case 'ready':
      return 'bg-green-500/15 text-green-400';
    case 'pending':
      return 'bg-amber-500/15 text-amber-300';
    default:
      return 'bg-gold/10 text-gold';
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
  const canCreateBooking = hasPermission('bookings.create');
  const canCreatePayment = hasPermission('payments.create');
  const canCreateExpense = hasPermission('expenses.create');

  const today = todayIso();

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
      color: string;
    }[] = [];

    if (canAccounts && allTime) {
      cards.push(
        {
          label: 'Cash Received',
          value: formatCurrency(allTime.amountReceived),
          sub: 'All-time collections',
          icon: ArrowDownLeft,
          color: 'text-green-400',
        },
        {
          label: 'Outstanding',
          value: formatCurrency(allTime.outstandingAmount),
          sub: 'Pending client balances',
          icon: Wallet,
          color: 'text-orange-400',
        },
        {
          label: 'Net Profit',
          value: formatCurrency(allTime.netProfit),
          sub: 'Cash received − expenses',
          icon: TrendingUp,
          color: 'text-gold',
        },
      );
    }

    if (canReports && reportsMonth) {
      cards.push({
        label: 'This Month Bookings',
        value: String(reportsMonth.bookingsCount),
        sub: `${reportsMonth.unpaidInvoicesCount} unpaid invoices`,
        icon: Camera,
        color: 'text-gold-light',
      });
    } else if (canAccounts && month) {
      cards.push({
        label: 'This Month Bookings',
        value: String(month.bookingsCount),
        sub: month.period.label,
        icon: Camera,
        color: 'text-gold-light',
      });
    }

    if (canAccounts && month) {
      cards.push({
        label: 'Month Expenses',
        value: formatCurrency(month.totalExpenses),
        sub: `Profit ${formatCurrency(month.netProfit)}`,
        icon: ArrowUpRight,
        color: 'text-red-400',
      });
    }

    return cards.slice(0, 4);
  }, [allTime, month, reportsMonth, canAccounts, canReports]);

  const quickActions = [
    canCreateBooking && { label: 'Bookings', to: '/bookings', icon: CalendarDays },
    canCreatePayment && { label: 'Record Payment', to: '/accounts', icon: ArrowDownLeft },
    canCreateExpense && { label: 'Add Expense', to: '/accounts', icon: Receipt },
    canReports && { label: 'Reports', to: '/reports', icon: TrendingUp },
  ].filter(Boolean) as { label: string; to: string; icon: typeof Plus }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-100">
            Welcome, {user?.fullName?.split(' ')[0]}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Dhara Photography Patan — Studio command center
          </p>
        </div>
        {quickActions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="btn-secondary inline-flex items-center text-sm"
              >
                <action.icon className="mr-2 h-4 w-4" />
                {action.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {(canAccounts || canReports) && (
        <div>
          <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">Studio Snapshot</p>
          {accountsDashboardQuery.isLoading && reportsDashboardQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <LoadingCard key={i} className="h-28" />
              ))}
            </div>
          ) : kpiCards.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kpiCards.map((card) => (
                <div key={card.label} className="card border-gold/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                        {card.label}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-gray-100">{card.value}</p>
                      <p className="mt-1 text-xs text-gray-500">{card.sub}</p>
                    </div>
                    <card.icon className={cn('h-5 w-5', card.color)} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel message="Financial summary will appear once accounts data is available." />
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-gold">Today&apos;s Shoots</h3>
            {canBookings && (
              <Link to="/calendar" className="text-xs text-gold hover:underline">
                Open calendar →
              </Link>
            )}
          </div>
          {!canBookings ? (
            <EmptyPanel message="You do not have permission to view bookings." />
          ) : todayBookingsQuery.isLoading ? (
            <LoadingCard className="h-40" />
          ) : (todayBookingsQuery.data?.length ?? 0) === 0 ? (
            <EmptyPanel message="No bookings scheduled for today." />
          ) : (
            <div className="space-y-2">
              {todayBookingsQuery.data?.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-gray-100">
                      {booking.bookingNumber} · {booking.eventType}
                    </p>
                    <p className="text-xs text-gray-500">
                      {booking.clientName}
                      {booking.venue ? ` · ${booking.venue}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs capitalize text-gray-400">{booking.status}</p>
                    <p className="font-semibold text-gold">{formatCurrency(booking.totalAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-gold">Upcoming Client Events</h3>
            {canClients && (
              <Link to="/clients" className="text-xs text-gold hover:underline">
                View clients →
              </Link>
            )}
          </div>
          {!canClients ? (
            <EmptyPanel message="You do not have permission to view client events." />
          ) : upcomingEventsQuery.isLoading ? (
            <LoadingCard className="h-40" />
          ) : (upcomingEventsQuery.data?.length ?? 0) === 0 ? (
            <EmptyPanel message="No upcoming birthdays or anniversaries in the next 30 days." />
          ) : (
            <div className="space-y-2">
              {upcomingEventsQuery.data?.slice(0, 6).map((event) => (
                <div
                  key={`${event.clientId}-${event.eventType}-${event.eventDate}`}
                  className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Gift className="h-4 w-4 text-gold" />
                    <div>
                      <p className="font-medium text-gray-100">{event.clientName}</p>
                      <p className="text-xs capitalize text-gray-500">
                        {event.eventType} · {formatDate(event.eventDate)}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold">
                    {event.daysUntil === 0 ? 'Today' : `${event.daysUntil}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {canDeliveries && (
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-gold">
              Upcoming / Pending Deliveries
            </h3>
            <Link to="/deliveries" className="text-xs text-gold hover:underline">
              View deliveries →
            </Link>
          </div>
          {upcomingDeliveriesQuery.isLoading ? (
            <LoadingCard className="h-40" />
          ) : upcomingDeliveriesQuery.isError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-6 text-center text-sm text-red-400">
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
                  className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-3 text-sm transition hover:border-gold/30 hover:bg-white/[0.02]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Package className="h-4 w-4 shrink-0 text-gold" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-100">
                        {delivery.clientName} · {delivery.bookingNumber}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {delivery.deliverableTypeLabel}
                        {delivery.title ? ` · ${delivery.title}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        deliveryStatusClass(delivery.status),
                      )}
                    >
                      {delivery.statusLabel}
                    </span>
                    <p className="mt-1 text-xs text-gray-400">
                      {delivery.expectedDate ? formatDate(delivery.expectedDate) : 'No date'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {canAccounts && (
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-gold">Recent Payments</h3>
            <Link to="/accounts" className="text-xs text-gold hover:underline">
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
                  className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="text-gray-200">{payment.clientName}</p>
                    <p className="text-xs text-gray-500">
                      {payment.receiptNumber} · {payment.paymentDate}
                    </p>
                  </div>
                  <p className="font-semibold text-green-400">{formatCurrency(payment.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {canReports && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-gray-500">This Month Analytics</p>
            <Link to="/reports" className="text-xs text-gold hover:underline">
              Full reports →
            </Link>
          </div>
          <ReportChartsSection charts={chartsQuery.data} loading={chartsQuery.isLoading} />
        </div>
      )}
    </div>
  );
}
