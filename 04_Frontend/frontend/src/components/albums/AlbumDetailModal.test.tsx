import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { AlbumDetailModal } from './AlbumDetailModal';
import { galleriesService } from '@/services/galleries-service';

vi.mock('@/services/galleries-service', async () => {
  const actual = await vi.importActual<typeof import('@/services/galleries-service')>(
    '@/services/galleries-service',
  );
  return {
    ...actual,
    galleriesService: {
      ...actual.galleriesService,
      listPhotos: vi.fn(),
    },
  };
});

vi.mock('@/components/gallery/GalleryPhotoImage', () => ({
  GalleryPhotoImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const album = {
  id: 'a1',
  name: 'Wedding Album',
  clientId: 'c1',
  clientName: 'Asha',
  bookingId: 'b1',
  bookingNumber: 'BK-000001',
  galleryId: 'g1',
  galleryName: 'Wedding Gallery',
  galleryArchived: true,
  albumType: 'standard' as const,
  albumPrice: 10000,
  pageCount: 20,
  selectedPhotoCount: 1,
  vendorExpense: 0,
  profit: 10000,
  status: 'pending' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  photos: [
    {
      id: 'ap1',
      galleryPhotoId: 'p1',
      galleryId: 'g1',
      originalName: 'ceremony.jpg',
      mimeType: 'image/jpeg',
      sortOrder: 0,
      available: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

describe('AlbumDetailModal', () => {
  it('does not load gallery files when the linked gallery is archived', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <AlbumDetailModal open album={album} onClose={() => undefined} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/The linked gallery is archived/i),
    ).toBeInTheDocument();
    expect(screen.getByText('ceremony.jpg')).toBeInTheDocument();
    expect(galleriesService.listPhotos).not.toHaveBeenCalled();
  });
});
