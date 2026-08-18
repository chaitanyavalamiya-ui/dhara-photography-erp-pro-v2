import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from './AppLayout';
import { useAuthStore } from '@/stores/auth-store';
import { settingsService } from '@/services/settings-service';

vi.mock('@/robo/RoboProvider', () => ({
  RoboProvider: ({ children }: { children: React.ReactNode }) => children,
  useRobo: () => ({ openChat: vi.fn() }),
}));

vi.mock('@/robo/RoboOverlay', () => ({
  RoboOverlay: () => null,
}));

vi.mock('@/services/settings-service', () => ({
  settingsService: {
    getCompanyProfile: vi.fn(),
  },
}));

function renderLayout(path = '/dashboard') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<div>Dashboard content</div>} />
            <Route path="/clients" element={<div>Clients content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AppLayout mobile navigation', () => {
  beforeEach(() => {
    vi.mocked(settingsService.getCompanyProfile).mockRejectedValue(new Error('unavailable'));
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Admin',
        email: 'admin@example.com',
        companyId: 'c1',
        permissions: ['dashboard.read', 'clients.read'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });
  });

  it('keeps desktop content offset classes and hides the drawer until opened', () => {
    const { container } = renderLayout();
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close navigation overlay' })).not.toBeInTheDocument();
    expect(container.querySelector('.md\\:ml-64')).toBeTruthy();
    expect(container.querySelector('.ml-64')).toBeNull();
  });

  it('opens an overlay drawer and closes it with the close button', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('button', { name: 'Close navigation overlay' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close navigation' }));
    expect(screen.queryByRole('button', { name: 'Close navigation overlay' })).not.toBeInTheDocument();
  });

  it('closes the drawer on Escape and after navigating', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Close navigation overlay' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    fireEvent.click(screen.getByRole('link', { name: /Clients/ }));
    expect(screen.getByText('Clients content')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close navigation overlay' })).not.toBeInTheDocument();
  });
});
