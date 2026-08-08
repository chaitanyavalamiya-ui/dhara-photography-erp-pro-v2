import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Activity, Database, Sparkles } from 'lucide-react';
import { healthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: healthService.check,
    refetchInterval: 30000,
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
