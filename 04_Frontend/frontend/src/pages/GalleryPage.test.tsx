import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GalleryPage } from './GalleryPage';
import { galleriesService } from '@/services/galleries-service';
import { clientsService } from '@/services/clients-service';
import { bookingsService } from '@/services/bookings-service';
import { useAuthStore } from '@/stores/auth-store';

vi.mock('@/services/galleries-service', async () => {
  const actual = await vi.importActual<typeof import('@/services/galleries-service')>(
    '@/services/galleries-service',
  );
  return {
    ...actual,
    galleriesService: {
      list: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      archive: vi.fn(),
      listPhotos: vi.fn(),
      uploadPhotos: vi.fn(),
      deletePhoto: vi.fn(),
      getPhotoUrl: actual.galleriesService.getPhotoUrl,
    },
  };
});

vi.mock('@/services/clients-service', () => ({
  clientsService: { list: vi.fn(), getById: vi.fn() },
}));

vi.mock('@/services/bookings-service', () => ({
  bookingsService: { list: vi.fn(), getById: vi.fn() },
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <GalleryPage />
    </QueryClientProvider>,
  );
}

describe('GalleryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Admin',
        email: 'admin@example.com',
        companyId: 'c1',
        permissions: ['gallery.read', 'gallery.create', 'gallery.update', 'gallery.archive'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
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
  });

  it('shows a first-time empty state', async () => {
    vi.mocked(galleriesService.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    renderPage();
    expect(await screen.findByText('No galleries yet.')).toBeInTheDocument();
  });

  it('shows a filtered empty state', async () => {
    vi.mocked(galleriesService.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Gallery name, client, booking...'), {
      target: { value: 'nope' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('No galleries match your filters.')).toBeInTheDocument();
  });

  it('shows archive only when the user has gallery.archive', async () => {
    vi.mocked(galleriesService.list).mockResolvedValue({
      items: [
        {
          id: 'g1',
          name: 'Wedding Gallery',
          clientId: 'c1',
          clientName: 'Asha',
          bookingId: 'b1',
          bookingNumber: 'BK-000001',
          status: 'draft',
          allowClientDownload: false,
          photoCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const { rerender } = renderPage();
    expect(await screen.findByLabelText('Archive gallery')).toBeInTheDocument();

    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Viewer',
        email: 'v@example.com',
        companyId: 'c1',
        permissions: ['gallery.read'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });
    rerender(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <GalleryPage />
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.queryByLabelText('Archive gallery')).not.toBeInTheDocument();
    });
  });
});
