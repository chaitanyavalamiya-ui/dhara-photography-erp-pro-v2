import { Bell, KeyRound, LogOut, Menu, Search, Settings, User } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/services/auth-service';
import { settingsService } from '@/services/settings-service';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { clearRememberedPostLoginPath } from '@/utils/post-login-path';
import { formatStudioLongDate, studioGreeting } from '@/components/dashboard/dashboard-format';

export const DEFAULT_STUDIO_HEADER_NAME = 'Dhara Photography Patan';

export function Header({ onOpenMobileNav }: { onOpenMobileNav?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = user?.fullName?.trim() || user?.fullName?.split(' ')[0] || 'there';
  const companyQuery = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: settingsService.getCompanyProfile,
    retry: false,
  });
  const studioName = companyQuery.data?.name?.trim() || DEFAULT_STUDIO_HEADER_NAME;

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Clear local session even if API call fails
    } finally {
      clearAuth();
      clearRememberedPostLoginPath();
      navigate('/login');
    }
  };

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (hasPermission('clients.read')) {
      navigate(value ? `/clients?q=${encodeURIComponent(value)}` : '/clients');
      return;
    }
    if (hasPermission('bookings.read')) {
      navigate('/bookings');
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('dhara-global-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="dhara-erp-header sticky top-0 z-20 flex items-center justify-between gap-4 px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onOpenMobileNav && (
          <button
            type="button"
            className="btn-secondary h-11 w-11 px-0 md:hidden"
            aria-label="Open navigation"
            onClick={onOpenMobileNav}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="dhara-erp-greeting">
          <p className="dhara-erp-studio">{studioName}</p>
          <p className="dhara-erp-phase">{studioGreeting()}</p>
          <h1>{displayName} 👋</h1>
          <p className="dhara-erp-gujarati hidden sm:block">
            તમારા સ્ટુડિયોની સફળતા માટે શાનદાર કામ કરો આજે.
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="hidden max-w-xl flex-1 xl:block">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
            style={{ color: 'var(--dhara-text-secondary)' }}
          />
          <input
            id="dhara-global-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input-field dhara-erp-search pl-12 pr-20"
            placeholder="Search clients, bookings, invoices..."
            aria-label="Search clients"
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px]"
            style={{ color: 'var(--dhara-text-secondary)' }}
          >
            Ctrl + K
          </span>
        </label>
      </form>

      <div className="flex items-center gap-2 sm:gap-3">
        <p className="dhara-erp-date">{formatStudioLongDate()}</p>
        <button
          type="button"
          className="btn-secondary dhara-erp-notify h-11 w-11 px-0"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="dhara-erp-menu" ref={menuRef}>
          <button
            type="button"
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 sm:px-3"
            style={{
              border: '1px solid var(--dhara-border)',
              background: 'var(--dhara-surface)',
            }}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: 'color-mix(in srgb, var(--dhara-accent) 18%, transparent)' }}
            >
              <User className="h-5 w-5" style={{ color: 'var(--dhara-accent)' }} />
            </div>
            <div className="hidden text-left lg:block">
              <p className="text-[15px] font-medium" style={{ color: 'var(--dhara-text-primary)' }}>
                {user?.fullName}
              </p>
              <p className="text-[12px]" style={{ color: 'var(--dhara-text-secondary)' }}>
                {user?.email}
              </p>
            </div>
          </button>
          {menuOpen && (
            <div className="dhara-erp-menu-panel" role="menu">
              {hasPermission('settings.read') && (
                <Link to="/settings" onClick={() => setMenuOpen(false)}>
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              )}
              <button type="button" onClick={() => { setMenuOpen(false); setChangePasswordOpen(true); }}>
                <KeyRound className="h-4 w-4" />
                Change Password
              </button>
              <button type="button" onClick={() => void handleLogout()}>
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </header>
  );
}
