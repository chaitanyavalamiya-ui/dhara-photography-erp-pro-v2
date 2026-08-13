import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GalleryPhotoImage } from './GalleryPhotoImage';
import { useAuthStore } from '@/stores/auth-store';

describe('GalleryPhotoImage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
      user: {
        id: 'u1',
        fullName: 'Admin',
        email: 'a@example.com',
        companyId: 'c1',
        permissions: ['gallery.read'],
      },
    });
  });

  it('requests the thumbnail variant by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['img'], { type: 'image/jpeg' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => 'blob:thumb',
      revokeObjectURL: () => undefined,
    });

    render(
      <GalleryPhotoImage galleryId="g1" photoId="p1" alt="photo" className="h-10 w-10" />,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('variant=thumbnail');
  });

  it('does not fetch when disabled', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(
      <GalleryPhotoImage
        galleryId="g1"
        photoId="p1"
        alt="photo"
        enabled={false}
        errorMessage="Unavailable"
        className="h-10 w-10"
      />,
    );
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
