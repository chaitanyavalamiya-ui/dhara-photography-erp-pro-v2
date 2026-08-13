import { describe, expect, it } from 'vitest';
import {
  MAX_GALLERY_UPLOAD_FILE_SIZE_BYTES,
  galleryFileTooLargeMessage,
  isGalleryUploadOversize,
} from './gallery-upload';

describe('gallery-upload', () => {
  it('accepts files at or below 200 MB and rejects larger files', () => {
    expect(isGalleryUploadOversize({ size: MAX_GALLERY_UPLOAD_FILE_SIZE_BYTES - 1 })).toBe(false);
    expect(isGalleryUploadOversize({ size: MAX_GALLERY_UPLOAD_FILE_SIZE_BYTES })).toBe(false);
    expect(isGalleryUploadOversize({ size: MAX_GALLERY_UPLOAD_FILE_SIZE_BYTES + 1 })).toBe(true);
    expect(galleryFileTooLargeMessage()).toBe(
      'File is too large. Maximum allowed size is 200 MB.',
    );
  });
});
