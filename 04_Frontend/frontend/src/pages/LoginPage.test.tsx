/**
 * FINAL LOCKED LOGIN PAGE — DO NOT MODIFY WITHOUT EXPLICIT USER APPROVAL
 *
 * Keep these tests aligned with the locked Login Page. Do not change expected
 * copy, layout markers, or login behavior unless the user explicitly requests
 * a specific Login Page change.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { LoginPage } from './LoginPage';
import { authService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';

vi.mock('@/services/auth-service', () => ({
  authService: {
    login: vi.fn(),
    getProfile: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
  },
}));

function renderLogin() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function axiosError(status: number, data: Record<string, unknown>) {
  return new AxiosError('Request failed', String(status), undefined, undefined, {
    status,
    data,
    statusText: 'Error',
    headers: {},
    config: {} as never,
  });
}

async function submitLogin() {
  fireEvent.change(screen.getByLabelText('સ્ટુડિયો કોડ'), {
    target: { value: 'DHARA-PATAN' },
  });
  fireEvent.change(screen.getByLabelText('ઈમેઈલ'), {
    target: { value: 'admin@example.com' },
  });
  fireEvent.change(screen.getByLabelText('પાસવર્ડ'), {
    target: { value: 'CurrentPass1' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'સાઇન ઇન કરો' }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it('renders a single Gujarati premium login layout', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /ધારા/ })).toBeInTheDocument();
    expect(screen.getByText('સ્વાગત છે')).toBeInTheDocument();
    expect(screen.getByText('ERP PRO')).toBeInTheDocument();
    expect(screen.queryByText('PHOTOGRAPHY')).not.toBeInTheDocument();
    expect(screen.getByText('સાઇન ઇન કરો')).toBeInTheDocument();
    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();
    expect(screen.queryByText(/Manage your studio/)).not.toBeInTheDocument();
    expect(document.querySelectorAll('form')).toHaveLength(1);
    expect(document.querySelector('.dhara-login')).toBeInTheDocument();
  });

  it('shows a generic invalid-credentials message', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      axiosError(401, {
        success: false,
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      }),
    );

    renderLogin();
    await submitLogin();

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith(
        expect.objectContaining({
          companyCode: 'DHARA-PATAN',
          email: 'admin@example.com',
          password: 'CurrentPass1',
        }),
        expect.anything(),
      );
    });
    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
  });

  it('shows lockout UX when ACCOUNT_LOCKED is returned', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      axiosError(401, {
        success: false,
        message: 'Account temporarily locked. Try again in 15 minute(s).',
        code: 'ACCOUNT_LOCKED',
        retryAfterSeconds: 900,
      }),
    );

    renderLogin();
    await submitLogin();

    expect(await screen.findByText(/Account temporarily locked/)).toBeInTheDocument();
  });

  it('shows rate-limit UX for 429 TOO_MANY_REQUESTS', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      axiosError(429, {
        success: false,
        message: 'Too many requests. Please try again later.',
        code: 'TOO_MANY_REQUESTS',
        retryAfterSeconds: 900,
      }),
    );

    renderLogin();
    await submitLogin();

    expect(
      await screen.findByText('Too many login attempts. Try again in 15 minute(s).'),
    ).toBeInTheDocument();
  });
});
