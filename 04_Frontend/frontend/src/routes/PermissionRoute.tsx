import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

interface PermissionRouteProps {
  permission: string;
  children: React.ReactNode;
}

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const location = useLocation();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  if (!hasPermission(permission)) {
    if (permission === 'dashboard.read' || location.pathname === '/dashboard') {
      return (
        <div className="card mx-auto max-w-lg text-center">
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Restricted</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-gold">Access denied</h1>
          <p className="mt-3 text-sm text-gray-400">
            Your role does not include permission to view this page.
          </p>
        </div>
      );
    }

    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
