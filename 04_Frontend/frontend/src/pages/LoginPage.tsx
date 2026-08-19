import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Camera } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/services/auth-service';
import { getLoginErrorMessage } from '@/utils/api-error';
import {
  resolvePostLoginPath,
  peekRememberedPostLoginPath,
  clearRememberedPostLoginPath,
} from '@/utils/post-login-path';

const loginSchema = z.object({
  companyCode: z.string().trim().min(1, 'Studio code is required').max(64, 'Studio code is too long'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const postLoginPath = resolvePostLoginPath(
    (location.state as { from?: { pathname?: string; search?: string } } | null)?.from ??
      peekRememberedPostLoginPath(),
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate(postLoginPath, { replace: true });
    }
  }, [isAuthenticated, navigate, postLoginPath]);

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
      clearRememberedPostLoginPath();
      navigate(postLoginPath, { replace: true });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-maroon-dark p-12 lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/20">
              <Camera className="h-6 w-6 text-gold" />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-gold">Dhara Photography</p>
              <p className="text-sm text-gray-400">Patan — Premium Wedding Studio</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-4xl font-bold leading-tight text-white">
            Manage your studio
            <br />
            <span className="text-gold">with elegance.</span>
          </h2>
          <p className="max-w-md text-gray-400">
            Professional ERP for bookings, clients, invoices, and studio operations.
          </p>
        </div>

        <p className="text-xs text-gray-600">
          © {new Date().getFullYear()} Dhara Photography Patan
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-surface p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <p className="font-display text-2xl font-bold text-gold">Dhara Photography</p>
            <p className="text-sm text-gray-500">Patan</p>
          </div>

          <h1 className="mb-2 text-2xl font-semibold text-gray-100">Welcome back</h1>
          <p className="mb-8 text-sm text-gray-500">Sign in with your studio code and account</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="companyCode" className="mb-1.5 block text-sm font-medium text-gray-300">
                Studio code
              </label>
              <input
                id="companyCode"
                type="text"
                autoComplete="organization"
                className="input-field"
                placeholder="DHARA-PATAN"
                {...register('companyCode')}
              />
              {errors.companyCode && (
                <p className="mt-1 text-xs text-red-400">{errors.companyCode.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="text"
                inputMode="email"
                autoComplete="email"
                className="input-field"
                placeholder="admin@dharaphotography.local"
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="input-field"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {loginMutation.isError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {getLoginErrorMessage(loginMutation.error)}
              </div>
            )}

            <button type="submit" disabled={loginMutation.isPending} className="btn-primary w-full">
              {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-600">
            Development credentials are configured via environment variables.
          </p>
        </div>
      </div>
    </div>
  );
}
