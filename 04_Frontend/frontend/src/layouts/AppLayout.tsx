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
  Camera,
  HardDrive,
  Bot,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/auth-store';
import { RoboOverlay } from '@/robo/RoboOverlay';
import { RoboProvider, useRobo } from '@/robo/RoboProvider';
import '@/styles/erp-chrome.css';

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard.read',
    roboTarget: 'dashboard-nav',
    accent: 'gold',
  },
  {
    to: '/clients',
    label: 'Clients',
    icon: Users,
    permission: 'clients.read',
    roboTarget: 'clients-nav',
    accent: 'cyan',
  },
  {
    to: '/bookings',
    label: 'Bookings',
    icon: BookOpen,
    permission: 'bookings.read',
    roboTarget: 'booking-nav',
    accent: 'magenta',
  },
  {
    to: '/calendar',
    label: 'Calendar',
    icon: CalendarDays,
    permission: 'bookings.read',
    roboTarget: 'calendar-nav',
    accent: 'amber',
  },
  {
    to: '/gallery',
    label: 'Gallery',
    icon: Image,
    permission: 'gallery.read',
    roboTarget: 'gallery-nav',
    accent: 'cyan',
  },
  {
    to: '/invoices',
    label: 'Invoices',
    icon: FileText,
    permission: 'invoices.read',
    roboTarget: 'invoice-nav',
    accent: 'gold',
  },
  {
    to: '/albums',
    label: 'Albums',
    icon: BookImage,
    permission: 'album.read',
    roboTarget: 'albums-nav',
    accent: 'purple',
  },
  {
    to: '/accounts',
    label: 'Accounts',
    icon: Wallet,
    permission: 'accounts.read',
    roboTarget: 'accounts-nav',
    accent: 'blue',
  },
  {
    to: '/expenses',
    label: 'Expenses',
    icon: Receipt,
    permission: 'expenses.read',
    roboTarget: 'expenses-nav',
    accent: 'pink',
  },
  {
    to: '/deliveries',
    label: 'Delivery',
    icon: Package,
    permission: 'delivery.read',
    roboTarget: 'delivery-nav',
    accent: 'cyan',
  },
  {
    to: '/equipment',
    label: 'Equipment',
    icon: Camera,
    permission: 'equipment.read',
    roboTarget: 'equipment-nav',
    accent: 'amber',
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: BarChart3,
    permission: 'reports.read',
    roboTarget: 'reports-nav',
    accent: 'purple',
  },
  {
    to: '/users',
    label: 'Users & Security',
    icon: Shield,
    permission: 'users.read',
    roboTarget: 'users-nav',
    accent: 'blue',
  },
  {
    to: '/staff',
    label: 'Staff',
    icon: UserCog,
    permission: 'staff.read',
    roboTarget: 'staff-nav',
    accent: 'magenta',
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings,
    permission: 'settings.read',
    roboTarget: 'settings-nav',
    accent: 'gold',
  },
  {
    to: '/settings?tab=backup-restore',
    label: 'Backup & Restore',
    icon: HardDrive,
    permission: 'settings.read',
    roboTarget: 'backup-nav',
    accent: 'blue',
  },
];

type NavItem = (typeof navItems)[number];

function isSidebarNavActive(item: NavItem, pathname: string, search: string): boolean {
  const [path, query = ''] = item.to.split('?');
  if (pathname !== path) return false;

  const currentTab = new URLSearchParams(search).get('tab');
  const itemTab = new URLSearchParams(query).get('tab');

  if (path === '/settings') {
    const onBackup = currentTab === 'backup-restore';
    return itemTab === 'backup-restore' ? onBackup : !onBackup;
  }

  return true;
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const location = useLocation();

  const visibleNavItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  return (
    <RoboProvider>
      <div className="dhara-erp-shell flex min-h-screen w-full max-w-none overflow-x-hidden">
        {mobileNavOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            aria-label="Close navigation overlay"
            onClick={() => setMobileNavOpen(false)}
          />
        )}
        <aside
          className={cn(
            'dhara-erp-sidebar fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r transition-transform duration-300 md:sticky md:top-0 md:z-30 md:h-svh md:translate-x-0 md:transition-[width]',
            collapsed ? 'w-[72px]' : 'w-72',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          )}
          style={{ borderColor: 'var(--dhara-border)' }}
        >
          <div
            className="flex h-[76px] items-center gap-3 px-4"
            style={{ borderBottom: '1px solid var(--dhara-border)' }}
          >
            <div className="dhara-erp-brand min-w-0 flex-1">
              <div className="dhara-erp-mark" aria-hidden>
                <Camera />
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate font-display text-lg font-semibold"
                    style={{ color: 'var(--dhara-accent-soft)' }}
                  >
                    Dhara Photography
                  </p>
                  <p
                    className="truncate text-[12px] uppercase tracking-[0.14em]"
                    style={{ color: 'var(--dhara-text-secondary)' }}
                  >
                    ERP PRO • PATAN
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn-secondary ml-auto h-10 w-10 px-0 md:hidden"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto p-3">
            {visibleNavItems.map((item) => (
              <NavLink
                key={`${item.label}-${item.to}`}
                to={item.to}
                data-robo-target={item.roboTarget}
                aria-current={
                  isSidebarNavActive(item, location.pathname, location.search) ? 'page' : undefined
                }
                className={() => {
                  const isActive = isSidebarNavActive(item, location.pathname, location.search);
                  return cn('dhara-nav-item', `is-${item.accent}`, isActive && 'is-active');
                }}
              >
                <span className="dhara-erp-nav-icon" aria-hidden>
                  <item.icon />
                </span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          <SidebarRoboButton collapsed={collapsed} />

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="dhara-nav-item hidden h-12 items-center justify-center rounded-none md:flex"
            style={{
              borderTop: '1px solid var(--dhara-border)',
              color: 'var(--dhara-text-secondary)',
            }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </aside>

        <div className="dhara-erp-workspace flex min-w-0 w-full flex-1 flex-col">
          <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main className="dhara-page min-w-0 w-full flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
          <footer
            className="px-6 py-3 text-center text-[14px]"
            style={{
              color: 'var(--dhara-text-secondary)',
              borderTop: '1px solid var(--dhara-border)',
            }}
          >
            © 2026 Dhara Photography ERP Pro. All rights reserved.
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
      className="dhara-nav-item is-magenta mx-3 mb-2"
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
      <span className="dhara-erp-nav-icon" aria-hidden>
        <Bot />
      </span>
      {!collapsed && <span>Robo AI Assistant</span>}
    </button>
  );
}
