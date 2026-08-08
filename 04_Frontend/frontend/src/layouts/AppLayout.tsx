import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BookOpen,
  Image,
  FileText,
  Wallet,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { cn } from '@/utils/cn';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.read' },
  { to: '/clients', label: 'Clients', icon: Users, permission: 'clients.read', disabled: true },
  {
    to: '/bookings',
    label: 'Bookings',
    icon: BookOpen,
    permission: 'bookings.read',
    disabled: true,
  },
  {
    to: '/calendar',
    label: 'Calendar',
    icon: CalendarDays,
    permission: 'bookings.read',
    disabled: true,
  },
  { to: '/gallery', label: 'Gallery', icon: Image, permission: 'bookings.read', disabled: true },
  {
    to: '/invoices',
    label: 'Invoices',
    icon: FileText,
    permission: 'invoices.read',
    disabled: true,
  },
  { to: '/accounts', label: 'Accounts', icon: Wallet, permission: 'payments.read', disabled: true },
  {
    to: '/reports',
    label: 'Reports',
    icon: BarChart3,
    permission: 'dashboard.read',
    disabled: true,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings,
    permission: 'settings.read',
    disabled: true,
  },
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-surface-border bg-maroon-dark transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-64',
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/20">
            <span className="font-display text-lg font-bold text-gold">D</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-gold">
                Dhara Photography
              </p>
              <p className="truncate text-xs text-gray-400">Patan</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.disabled ? '#' : item.to}
              onClick={(e) => item.disabled && e.preventDefault()}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  item.disabled
                    ? 'cursor-not-allowed text-gray-600'
                    : isActive
                      ? 'bg-gold/15 text-gold'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200',
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.disabled && (
                <span className="ml-auto rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500">
                  Soon
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-12 items-center justify-center border-t border-white/10 text-gray-400 transition hover:text-gold"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </aside>

      <div
        className={cn(
          'flex flex-1 flex-col transition-all duration-300',
          collapsed ? 'ml-[72px]' : 'ml-64',
        )}
      >
        <Header />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
