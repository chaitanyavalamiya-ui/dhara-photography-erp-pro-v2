import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/services/auth-service';

interface AuthSessionBootstrapProps {
  children: React.ReactNode;
}

function isAuthFailure(error: unknown): boolean {
  if (!(error instanceof AxiosError)) {
    return false;
  }
  const status = error.response?.status;
  return status === 401 || status === 403;
}

export function AuthSessionBootstrap({ children }: AuthSessionBootstrapProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const updateUser = useAuthStore((s) => s.updateUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [hasHydrated, setHasHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    setHasHydrated(useAuthStore.persist.hasHydrated());
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!accessToken || !refreshToken) {
      setIsReady(true);
      return;
    }

    let cancelled = false;

    authService
      .getProfile()
      .then((user) => {
        if (!cancelled) {
          updateUser(user);
          setIsReady(true);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          if (isAuthFailure(error)) {
            clearAuth();
          }
          setIsReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, accessToken, refreshToken, updateUser, clearAuth]);

  if (!hasHydrated || !isReady) {
    return null;
  }

  return <>{children}</>;
}
