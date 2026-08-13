import { render, screen, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionBootstrap } from './AuthSessionBootstrap';
import { authService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';

vi.mock('@/services/auth-service', () => ({
  authService: {
    getProfile: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
  },
}));

describe('AuthSessionBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it('calls /auth/me after token rehydration and syncs the user', async () => {
    const profile = {
      id: 'user-1',
      fullName: 'Admin User',
      email: 'admin@example.com',
      companyId: 'company-1',
      permissions: ['users.read'],
    };
    vi.mocked(authService.getProfile).mockResolvedValue(profile);

    useAuthStore.setState({
      user: { ...profile, permissions: [] },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      isAuthenticated: true,
    });

    render(
      <AuthSessionBootstrap>
        <div>ready</div>
      </AuthSessionBootstrap>,
    );

    expect(await screen.findByText('ready')).toBeInTheDocument();
    expect(authService.getProfile).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user?.permissions).toEqual(['users.read']);
  });

  it('clears an invalid session when /auth/me returns 401', async () => {
    vi.mocked(authService.getProfile).mockRejectedValue(
      new AxiosError('Unauthorized', '401', undefined, undefined, {
        status: 401,
        data: { success: false, message: 'User account is not active.' },
        statusText: 'Unauthorized',
        headers: {},
        config: {} as never,
      }),
    );

    useAuthStore.setState({
      user: {
        id: 'user-1',
        fullName: 'Admin User',
        email: 'admin@example.com',
        companyId: 'company-1',
        permissions: ['users.read'],
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      isAuthenticated: true,
    });

    render(
      <AuthSessionBootstrap>
        <div>ready</div>
      </AuthSessionBootstrap>,
    );

    expect(await screen.findByText('ready')).toBeInTheDocument();
    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().accessToken).toBeNull();
    });
  });
});
