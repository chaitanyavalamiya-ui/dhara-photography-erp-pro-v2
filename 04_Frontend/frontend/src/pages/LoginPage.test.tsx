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
  fireEvent.change(screen.getByLabelText('Studio code'), {
    target: { value: 'DHARA-PATAN' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'admin@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'CurrentPass1' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
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
