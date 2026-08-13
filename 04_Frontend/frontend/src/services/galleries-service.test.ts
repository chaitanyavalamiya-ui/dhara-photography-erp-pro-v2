import { beforeEach, describe, expect, it, vi } from 'vitest';
import { galleriesService } from './galleries-service';
import { apiClient } from './api-client';
import {
  GALLERY_UPLOAD_TIMEOUT_MS,
  MAX_GALLERY_UPLOAD_FILE_SIZE_BYTES,
  galleryFileTooLargeMessage,
} from '@/utils/gallery-upload';

vi.mock('./api-client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

function jpegFile(name: string, size = 12): File {
  const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], name, { type: 'image/jpeg' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('galleriesService.uploadPhoto', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it('uploads one file per request sequentially', async () => {
    const calls: string[] = [];
    vi.mocked(apiClient.post).mockImplementation(async (_url, body) => {
      const form = body as FormData;
      const file = form.get('files') as File;
      calls.push(file.name);
      return {
        data: {
          data: [
            {
              id: file.name,
              fileName: file.name,
              originalName: file.name,
              mimeType: 'image/jpeg',
              fileSize: file.size,
              sortOrder: calls.length - 1,
              clientSelected: false,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      };
    });

    const created = await galleriesService.uploadPhotos('g1', [
      jpegFile('a.jpg'),
      jpegFile('b.jpg'),
    ]);

    expect(created.map((photo) => photo.id)).toEqual(['a.jpg', 'b.jpg']);
    expect(apiClient.post).toHaveBeenCalledTimes(2);
    expect(vi.mocked(apiClient.post).mock.calls[0][2]).toEqual(
      expect.objectContaining({ timeout: GALLERY_UPLOAD_TIMEOUT_MS }),
    );
    const firstForm = vi.mocked(apiClient.post).mock.calls[0][1] as FormData;
    const secondForm = vi.mocked(apiClient.post).mock.calls[1][1] as FormData;
    expect([...firstForm.getAll('files')]).toHaveLength(1);
    expect([...secondForm.getAll('files')]).toHaveLength(1);
  });

  it('rejects oversize files before posting', async () => {
    await expect(
      galleriesService.uploadPhoto(
        'g1',
        jpegFile('huge.jpg', MAX_GALLERY_UPLOAD_FILE_SIZE_BYTES + 1),
      ),
    ).rejects.toThrow(galleryFileTooLargeMessage());
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('continues sequential uploads only for files that are posted', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'ok',
              fileName: 'ok.jpg',
              originalName: 'ok.jpg',
              mimeType: 'image/jpeg',
              fileSize: 12,
              sortOrder: 0,
              clientSelected: false,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      })
      .mockRejectedValueOnce(new Error('network'));

    await expect(
      galleriesService.uploadPhotos('g1', [jpegFile('ok.jpg'), jpegFile('fail.jpg')]),
    ).rejects.toThrow('network');
    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });
});
