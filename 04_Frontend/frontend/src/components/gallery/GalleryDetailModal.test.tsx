import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
      uploadPhoto: vi.fn(),
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
  beforeEach(() => {
    vi.mocked(galleriesService.listPhotos).mockReset();
    vi.mocked(galleriesService.uploadPhoto).mockReset();
    vi.mocked(galleriesService.deletePhoto).mockReset();
  });
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

  it('uploads selected files one at a time and keeps successes when another fails', async () => {
    vi.mocked(galleriesService.listPhotos).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 40,
      totalPages: 1,
    });
    vi.mocked(galleriesService.uploadPhoto)
      .mockResolvedValueOnce({
        id: 'p1',
        fileName: 'ok.jpg',
        originalName: 'ok.jpg',
        mimeType: 'image/jpeg',
        fileSize: 10,
        sortOrder: 0,
        clientSelected: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      })
      .mockRejectedValueOnce(new Error('server rejected'));

    renderModal();
    await screen.findByText(/No photos yet/);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const ok = new File([new Uint8Array([1])], 'ok.jpg', { type: 'image/jpeg' });
    const bad = new File([new Uint8Array([2])], 'bad.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [ok, bad] } });

    await waitFor(() => {
      expect(galleriesService.uploadPhoto).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('uploaded')).toBeInTheDocument();
    expect(await screen.findByText('failed')).toBeInTheDocument();
    expect(screen.getByText('server rejected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('rejects oversize files locally with the 200 MB message', async () => {
    vi.mocked(galleriesService.listPhotos).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 40,
      totalPages: 1,
    });

    renderModal();
    await screen.findByText(/No photos yet/);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const huge = new File([new Uint8Array([1])], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(huge, 'size', { value: 200 * 1024 * 1024 + 1 });
    fireEvent.change(input, { target: { files: [huge] } });

    expect(await screen.findByText('File is too large. Maximum allowed size is 200 MB.')).toBeInTheDocument();
    expect(galleriesService.uploadPhoto).not.toHaveBeenCalled();
  });
});
