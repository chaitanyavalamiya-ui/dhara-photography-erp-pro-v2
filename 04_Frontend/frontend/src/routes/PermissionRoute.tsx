import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

interface PermissionRouteProps {
  permission: string;
  children: React.ReactNode;
}

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);

  if (!hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
