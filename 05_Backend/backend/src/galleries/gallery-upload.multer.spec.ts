import { createGalleryUploadMulterOptions } from './gallery-upload.multer';
import { MAX_UPLOAD_FILE_SIZE_BYTES, MAX_UPLOAD_FILES_PER_REQUEST } from './utils/gallery.utils';

describe('createGalleryUploadMulterOptions', () => {
  it('uses disk storage and a 200 MB single-file limit', () => {
    const options = createGalleryUploadMulterOptions();
    expect(typeof (options.storage as { getDestination?: unknown }).getDestination).toBe(
      'function',
    );
    expect(options.limits.fileSize).toBe(MAX_UPLOAD_FILE_SIZE_BYTES);
    expect(options.limits.files).toBe(MAX_UPLOAD_FILES_PER_REQUEST);
    expect(options.limits.fileSize).toBe(200 * 1024 * 1024);
    expect(options.limits.files).toBe(1);
  });

  it('rejects unsupported MIME types', () => {
    const options = createGalleryUploadMulterOptions();
    const callback = jest.fn();
    options.fileFilter(
      null,
      { originalname: 'x.exe', mimetype: 'application/octet-stream' },
      callback,
    );
    expect(callback).toHaveBeenCalledWith(expect.any(Error), false);
  });
});
