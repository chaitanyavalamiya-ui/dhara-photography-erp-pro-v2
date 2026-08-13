import { Bell, KeyRound, LogOut, Search, Settings, User } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/services/auth-service';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [query, setQuery] = useState('');

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Clear local session even if API call fails
    } finally {
      clearAuth();
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

  return (
    <header
      className="dhara-erp-header sticky top-0 z-20 flex h-[76px] items-center justify-between gap-4 px-4 sm:px-6"
      style={{
        background: 'var(--dhara-glass-bg)',
        borderBottom: '1px solid var(--dhara-border)',
        backdropFilter: 'blur(var(--dhara-glass-blur))',
      }}
    >
      <div className="min-w-0">
        <h1 className="text-[14px] uppercase tracking-[0.16em]" style={{ color: 'var(--dhara-text-secondary)' }}>
          Studio Management
        </h1>
        <p className="truncate font-display text-[20px] font-semibold" style={{ color: 'var(--dhara-accent-soft)' }}>
          Dhara Photography Patan
        </p>
      </div>

      <form onSubmit={handleSearch} className="hidden max-w-xl flex-1 md:block">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2"
            style={{ color: 'var(--dhara-text-secondary)' }}
          />
          <input
            id="dhara-global-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input-field dhara-header-search pl-11 pr-16"
            placeholder="Search clients"
            aria-label="Search clients"
          />
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px]"
            style={{ color: 'var(--dhara-text-secondary)' }}
          >
            Ctrl + K
          </span>
        </label>
      </form>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="btn-secondary h-11 w-11 px-0"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        {hasPermission('settings.read') && (
          <Link to="/settings" className="btn-secondary h-11 w-11 px-0" aria-label="Settings" title="Settings">
            <Settings className="h-5 w-5" />
          </Link>
        )}

        <div
          className="flex items-center gap-3 rounded-lg px-3 py-1.5"
          style={{
            border: '1px solid var(--dhara-border)',
            background: 'var(--dhara-surface)',
          }}
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: 'color-mix(in srgb, var(--dhara-accent) 18%, transparent)' }}
          >
            <User className="h-5 w-5" style={{ color: 'var(--dhara-accent)' }} />
          </div>
          <div className="hidden sm:block">
            <p className="text-[16px] font-medium" style={{ color: 'var(--dhara-text-primary)' }}>
              {user?.fullName}
            </p>
            <p className="text-[14px]" style={{ color: 'var(--dhara-text-secondary)' }}>
              {user?.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setChangePasswordOpen(true)}
          className="btn-secondary hidden items-center gap-2 px-3 py-2 text-sm lg:inline-flex"
        >
          <KeyRound className="h-5 w-5" />
          Change Password
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition duration-200"
          style={{
            color: 'var(--dhara-danger)',
            border: '1px solid color-mix(in srgb, var(--dhara-danger) 35%, transparent)',
          }}
        >
          <LogOut className="h-5 w-5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </header>
  );
}
