import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [hasHydrated, setHasHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });

    setHasHydrated(useAuthStore.persist.hasHydrated());

    return unsubscribe;
  }, []);

  if (!hasHydrated) {
    return null;
  }

  const hasSession = isAuthenticated || Boolean(accessToken && refreshToken);

  if (!hasSession) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
