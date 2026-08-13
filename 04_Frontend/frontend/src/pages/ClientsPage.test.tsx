import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientsPage } from './ClientsPage';
import { clientsService } from '@/services/clients-service';
import { useAuthStore } from '@/stores/auth-store';

vi.mock('@/services/clients-service', () => ({
  clientsService: {
    list: vi.fn(),
    getById: vi.fn(),
    getUpcomingEvents: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    restore: vi.fn(),
  },
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ClientsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const emptyPage = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 1,
};

describe('ClientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Admin',
        email: 'admin@example.com',
        companyId: 'c1',
        permissions: ['clients.read', 'clients.create', 'clients.update', 'clients.archive'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });
    vi.mocked(clientsService.getUpcomingEvents).mockResolvedValue([]);
    vi.mocked(clientsService.list).mockResolvedValue(emptyPage);
  });

  it('shows a first-time empty state', async () => {
    renderPage();
    expect(await screen.findByText('No clients yet.')).toBeInTheDocument();
  });

  it('shows a search empty state', async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Search by name, mobile, email, or city'), {
      target: { value: 'nope' },
    });
    fireEvent.submit(screen.getByPlaceholderText('Search by name, mobile, email, or city').closest('form')!);
    expect(await screen.findByText('No clients match your search.')).toBeInTheDocument();
  });

  it('hides Edit when the user lacks clients.update', async () => {
    vi.mocked(clientsService.list).mockResolvedValue({
      ...emptyPage,
      items: [
        {
          id: 'c1',
          clientNumber: 'CLT-000001',
          fullName: 'Asha',
          mobile: '9876543210',
          status: 'Active',
          isActive: true,
          totalBookings: 0,
          totalAmount: 0,
          outstandingBalance: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
    });

    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Viewer',
        email: 'v@example.com',
        companyId: 'c1',
        permissions: ['clients.read'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });

    renderPage();
    expect(await screen.findByText('Asha')).toBeInTheDocument();
    expect(screen.queryByLabelText('Edit client')).not.toBeInTheDocument();
  });
});
