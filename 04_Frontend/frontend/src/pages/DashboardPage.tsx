import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Activity, Database, Package, Sparkles } from 'lucide-react';
import { healthService } from '@/services/auth-service';
import { deliveriesService, DeliveryItem } from '@/services/deliveries-service';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/utils/booking-form';
import { cn } from '@/utils/cn';

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
  const canDeliveries = hasPermission('delivery.read');

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: healthService.check,
    refetchInterval: 30000,
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

  const stats = [
    {
      label: 'API Status',
      value: health?.status === 'ok' ? 'Online' : 'Degraded',
      sub: health?.database === 'connected' ? 'Database connected' : 'Database offline',
      icon: Activity,
      color: health?.status === 'ok' ? 'text-green-400' : 'text-orange-400',
    },
    {
      label: 'Your Role',
      value: `${user?.permissions.length ?? 0} permissions`,
      sub: 'Database-driven RBAC',
      icon: Sparkles,
      color: 'text-gold',
    },
    {
      label: 'Phase',
      value: 'Foundation',
      sub: 'Phase 0 — Core platform ready',
      icon: LayoutDashboard,
      color: 'text-gold-light',
    },
    {
      label: 'Database',
      value: health?.database === 'connected' ? 'PostgreSQL' : 'Offline',
      sub: `v${health?.version ?? '—'}`,
      icon: Database,
      color: health?.database === 'connected' ? 'text-green-400' : 'text-red-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-100">
          Welcome, {user?.fullName?.split(' ')[0]}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Dhara Photography Patan — Studio command center
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  {stat.label}
                </p>
                <p className="mt-2 text-xl font-semibold text-gray-100">{stat.value}</p>
                <p className="mt-1 text-xs text-gray-500">{stat.sub}</p>
              </div>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
          </div>
        ))}
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
            <div className="card animate-pulse h-40 bg-surface-elevated" />
          ) : upcomingDeliveriesQuery.isError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-6 text-center text-sm text-red-400">
              Failed to load deliveries.
            </div>
          ) : (upcomingDeliveriesQuery.data?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Package className="mb-3 h-8 w-8 text-gray-600" />
              <p className="text-sm text-gray-500">No pending or ready deliveries right now.</p>
            </div>
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

      <div className="card border-gold/20">
        <h3 className="font-display text-lg font-semibold text-gold">Phase 0 Complete</h3>
        <p className="mt-2 text-sm text-gray-400">
          The foundation platform is ready. Upcoming modules — Clients, Bookings, Invoices, and
          Payments — will be built on this architecture in Phase 1.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {['Authentication', 'RBAC', 'Health Check', 'Audit Logging', 'Prisma Schema'].map(
            (item) => (
              <span
                key={item}
                className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold"
              >
                {item}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
