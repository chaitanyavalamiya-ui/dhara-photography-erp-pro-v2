import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { GalleryDetailModal } from './GalleryDetailModal';
import { galleriesService } from '@/services/galleries-service';
import { useAuthStore } from '@/stores/auth-store';

vi.mock('@/services/galleries-service', async () => {
  const actual = await vi.importActual<typeof import('@/services/galleries-service')>(
    '@/services/galleries-service',
  );
  return {
    ...actual,
    galleriesService: {
      ...actual.galleriesService,
      listPhotos: vi.fn(),
      uploadPhotos: vi.fn(),
      deletePhoto: vi.fn(),
    },
  };
});

vi.mock('./GalleryPhotoImage', () => ({
  GalleryPhotoImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const gallery = {
  id: 'g1',
  name: 'Wedding Gallery',
  clientId: 'c1',
  clientName: 'Asha',
  bookingId: 'b1',
  bookingNumber: 'BK-000001',
  status: 'draft' as const,
  allowClientDownload: false,
  photoCount: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderModal() {
  useAuthStore.setState({
    user: {
      id: 'u1',
      fullName: 'Admin',
      email: 'a@example.com',
      companyId: 'c1',
      permissions: ['gallery.read', 'gallery.update'],
    },
    accessToken: 't',
    refreshToken: 'r',
    isAuthenticated: true,
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <GalleryDetailModal open gallery={gallery} canUpdate onClose={() => undefined} />
    </QueryClientProvider>,
  );
}

describe('GalleryDetailModal', () => {
  it('paginates photos with load more', async () => {
    vi.mocked(galleriesService.listPhotos)
      .mockResolvedValueOnce({
        items: [
          {
            id: 'p1',
            fileName: 'a.jpg',
            originalName: 'a.jpg',
            mimeType: 'image/jpeg',
            fileSize: 10,
            sortOrder: 0,
            clientSelected: false,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        total: 2,
        page: 1,
        limit: 40,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'p2',
            fileName: 'b.jpg',
            originalName: 'b.jpg',
            mimeType: 'image/jpeg',
            fileSize: 10,
            sortOrder: 1,
            clientSelected: false,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        total: 2,
        page: 2,
        limit: 40,
        totalPages: 2,
      });

    renderModal();
    expect(await screen.findByAltText('a.jpg')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load more photos' }));
    expect(await screen.findByAltText('b.jpg')).toBeInTheDocument();
  });
});
