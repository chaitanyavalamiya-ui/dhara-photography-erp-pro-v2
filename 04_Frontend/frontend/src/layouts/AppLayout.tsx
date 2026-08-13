import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BookOpen,
  Image,
  BookImage,
  FileText,
  Wallet,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Shield,
  Package,
  Receipt,
  HardDrive,
  Bot,
  Camera,
} from 'lucide-react';
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/auth-store';
import { RoboOverlay } from '@/robo/RoboOverlay';
import { RoboProvider, useRobo } from '@/robo/RoboProvider';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.read', roboTarget: 'dashboard-nav' },
  { to: '/clients', label: 'Clients', icon: Users, permission: 'clients.read', roboTarget: 'clients-nav' },
  { to: '/bookings', label: 'Bookings', icon: BookOpen, permission: 'bookings.read', roboTarget: 'booking-nav' },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, permission: 'bookings.read', roboTarget: 'calendar-nav' },
  { to: '/gallery', label: 'Gallery', icon: Image, permission: 'gallery.read', roboTarget: 'gallery-nav' },
  { to: '/invoices', label: 'Invoices', icon: FileText, permission: 'invoices.read', roboTarget: 'invoice-nav' },
  { to: '/albums', label: 'Albums', icon: BookImage, permission: 'album.read', roboTarget: 'albums-nav' },
  { to: '/accounts', label: 'Accounts', icon: Wallet, permission: 'accounts.read', roboTarget: 'accounts-nav' },
  { to: '/accounts', label: 'Expenses', icon: Receipt, permission: 'expenses.read', roboTarget: 'expenses-nav' },
  { to: '/deliveries', label: 'Delivery', icon: Package, permission: 'delivery.read', roboTarget: 'delivery-nav' },
  { to: '/bookings', label: 'Equipment', icon: Camera, permission: 'bookings.read', roboTarget: 'equipment-nav' },
  { to: '/reports', label: 'Reports', icon: BarChart3, permission: 'reports.read', roboTarget: 'reports-nav' },
  { to: '/users', label: 'Users & Security', icon: Shield, permission: 'users.read', roboTarget: 'users-nav' },
  { to: '/staff', label: 'Staff', icon: UserCog, permission: 'staff.read', roboTarget: 'staff-nav' },
  { to: '/settings', label: 'Settings', icon: Settings, permission: 'settings.read', roboTarget: 'settings-nav' },
  {
    to: '/settings?tab=backup-restore',
    label: 'Backup & Restore',
    icon: HardDrive,
    permission: 'settings.read',
    roboTarget: 'backup-nav',
  },
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const location = useLocation();

  const visibleNavItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <RoboProvider>
    <div className="dhara-erp-shell flex min-h-screen">
      <aside
        className={cn(
          'dhara-erp-sidebar fixed inset-y-0 left-0 z-30 flex flex-col border-r transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-64',
        )}
        style={{
          background:
            'radial-gradient(800px 240px at 0% 0%, var(--dhara-glow), transparent 60%), var(--dhara-bg-secondary)',
          borderColor: 'var(--dhara-border)',
        }}
      >
        <div
          className="flex h-[76px] items-center gap-3 px-4"
          style={{ borderBottom: '1px solid var(--dhara-border)' }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-display text-lg font-semibold"
            style={{
              color: 'var(--dhara-accent)',
              border: '1px solid var(--dhara-border)',
              background: 'color-mix(in srgb, var(--dhara-accent) 12%, transparent)',
            }}
          >
            D
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold" style={{ color: 'var(--dhara-accent-soft)' }}>
                Dhara Photography
              </p>
              <p className="truncate text-[13px] uppercase tracking-[0.16em]" style={{ color: 'var(--dhara-text-secondary)' }}>
                Patan
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-3">
          {visibleNavItems.map((item) => (
            <NavLink
              key={`${item.label}-${item.to}`}
              to={item.to}
              data-robo-target={item.roboTarget}
              className={() => {
                const backupActive =
                  item.to.includes('backup-restore') &&
                  location.pathname === '/settings' &&
                  location.search.includes('backup-restore');
                const settingsActive =
                  item.label === 'Settings' &&
                  location.pathname === '/settings' &&
                  !location.search.includes('backup-restore');
                const expensesActive =
                  item.label === 'Expenses' && location.pathname === '/accounts';
                const accountsActive =
                  item.label === 'Accounts' && location.pathname === '/accounts';
                const standardActive =
                  !item.to.includes('?') &&
                  item.label !== 'Accounts' &&
                  item.label !== 'Expenses' &&
                  item.label !== 'Equipment' &&
                  location.pathname === item.to.split('?')[0];
                const isActive =
                  backupActive || settingsActive || standardActive || expensesActive || accountsActive;
                return cn('dhara-nav-item', isActive && 'is-active');
              }}
            >
              <item.icon />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <SidebarRoboButton collapsed={collapsed} />

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="dhara-nav-item flex h-12 items-center justify-center rounded-none"
          style={{ borderTop: '1px solid var(--dhara-border)', color: 'var(--dhara-text-secondary)' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </aside>

      <div
        className={cn('flex flex-1 flex-col transition-all duration-300', collapsed ? 'ml-[72px]' : 'ml-64')}
      >
        <Header />
        <main className="dhara-page flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
        <footer
          className="px-6 py-3 text-center text-[14px]"
          style={{
            color: 'var(--dhara-text-secondary)',
            borderTop: '1px solid var(--dhara-border)',
          }}
        >
          Dhara Photography ERP Pro · Crafted for photographers · Patan
        </footer>
      </div>
      <RoboOverlay />
    </div>
    </RoboProvider>
  );
}

function SidebarRoboButton({ collapsed }: { collapsed: boolean }) {
  const { openChat } = useRobo();
  return (
    <button
      type="button"
      className="dhara-nav-item mx-3 mb-2"
      data-robo-target="robo-nav"
      title="Robo AI Assistant"
      aria-label="Open Robo AI Assistant from sidebar"
      style={{
        color: 'var(--dhara-accent-soft)',
        border: '1px solid var(--dhara-border)',
        background: 'color-mix(in srgb, var(--dhara-accent) 10%, var(--dhara-surface))',
      }}
      onClick={openChat}
    >
      <Bot />
      {!collapsed && <span>Robo AI Assistant</span>}
    </button>
  );
}
