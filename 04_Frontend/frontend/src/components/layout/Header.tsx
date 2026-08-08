import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/services/auth-service';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

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

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-surface-border bg-surface/80 px-6 backdrop-blur-md">
      <div>
        <h1 className="text-sm font-medium text-gray-400">Studio Management</h1>
        <p className="font-display text-lg font-semibold text-gray-100">Dhara Photography Patan</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface-card px-3 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20">
            <User className="h-4 w-4 text-gold" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-200">{user?.fullName}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm text-gray-400 transition hover:border-red-500/40 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
