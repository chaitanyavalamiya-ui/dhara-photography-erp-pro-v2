import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { AlbumsPage } from './AlbumsPage';
import { albumsService } from '@/services/albums-service';
import { clientsService } from '@/services/clients-service';
import { bookingsService } from '@/services/bookings-service';
import { useAuthStore } from '@/stores/auth-store';

vi.mock('@/services/albums-service', async () => {
  const actual = await vi.importActual<typeof import('@/services/albums-service')>(
    '@/services/albums-service',
  );
  return {
    ...actual,
    albumsService: {
      ...actual.albumsService,
      list: vi.fn(),
      getById: vi.fn(),
    },
  };
});

vi.mock('@/services/clients-service', () => ({
  clientsService: { list: vi.fn(), getById: vi.fn() },
}));

vi.mock('@/services/bookings-service', () => ({
  bookingsService: { list: vi.fn(), getById: vi.fn() },
}));

describe('AlbumsPage empty states', () => {
  it('shows no albums yet when there are no filters', async () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Admin',
        email: 'a@example.com',
        companyId: 'c1',
        permissions: ['album.read', 'album.create'],
      },
      accessToken: 't',
      refreshToken: 'r',
      isAuthenticated: true,
    });
    vi.mocked(albumsService.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    vi.mocked(clientsService.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
    vi.mocked(bookingsService.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 1,
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <AlbumsPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('No albums yet.')).toBeInTheDocument();
  });
});
