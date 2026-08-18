import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STUDIO_HEADER_NAME, Header } from './Header';
import { settingsService } from '@/services/settings-service';
import { useAuthStore } from '@/stores/auth-store';

vi.mock('@/services/settings-service', () => ({
  settingsService: {
    getCompanyProfile: vi.fn(),
  },
}));

function renderHeader() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <Header />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('Header studio name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Admin',
        email: 'admin@example.com',
        companyId: 'c1',
        permissions: [],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });
  });

  it('falls back to Dhara Photography Patan when the profile is unavailable', async () => {
    vi.mocked(settingsService.getCompanyProfile).mockRejectedValue(new Error('offline'));
    renderHeader();
    expect(await screen.findByText(DEFAULT_STUDIO_HEADER_NAME)).toBeInTheDocument();
  });

  it('shows the company profile name when available', async () => {
    vi.mocked(settingsService.getCompanyProfile).mockResolvedValue({
      id: 'c1',
      name: 'Studio Patan West',
      code: 'DHARA',
      isActive: true,
    });
    renderHeader();
    expect(await screen.findByText('Studio Patan West')).toBeInTheDocument();
    expect(screen.queryByText(DEFAULT_STUDIO_HEADER_NAME)).not.toBeInTheDocument();
  });

  it('keeps the fallback while the profile is loading', () => {
    vi.mocked(settingsService.getCompanyProfile).mockReturnValue(new Promise(() => undefined));
    renderHeader();
    expect(screen.getByText(DEFAULT_STUDIO_HEADER_NAME)).toBeInTheDocument();
  });
});
