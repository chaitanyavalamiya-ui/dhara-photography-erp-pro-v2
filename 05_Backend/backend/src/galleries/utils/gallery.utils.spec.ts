import { writeFileSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  assertValidUploadFile,
  canAccessOriginalPhoto,
  detectImageMimeFromMagicBytes,
  MAGIC_BYTE_HEADER_LENGTH,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  MAX_UPLOAD_FILES_PER_REQUEST,
  readFileHeader,
  sanitizeFileName,
  uploadFileTooLargeMessage,
} from './gallery.utils';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

describe('gallery.utils', () => {
  it('sanitizes file names without path separators', () => {
    expect(sanitizeFileName('../../etc/passwd.jpg')).toBe('.._.._etc_passwd.jpg');
  });

  it('detects JPEG and PNG magic bytes', () => {
    expect(detectImageMimeFromMagicBytes(JPEG)).toBe('image/jpeg');
    expect(detectImageMimeFromMagicBytes(PNG)).toBe('image/png');
    expect(detectImageMimeFromMagicBytes(Buffer.from('not-an-image'))).toBeNull();
  });

  it('rejects spoofed MIME types', () => {
    expect(() =>
      assertValidUploadFile({
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: JPEG.length,
        header: Buffer.from('hello'),
      }),
    ).toThrow(/does not match/);
  });

  it('rejects NUL characters in file names', () => {
    expect(() =>
      assertValidUploadFile({
        originalname: 'photo\0.jpg',
        mimetype: 'image/jpeg',
        size: JPEG.length,
        header: JPEG,
      }),
    ).toThrow(/Invalid file name/);
  });

  it('accepts files below and exactly at the 200 MB limit', () => {
    expect(() =>
      assertValidUploadFile({
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: MAX_UPLOAD_FILE_SIZE_BYTES - 1,
        header: JPEG,
      }),
    ).not.toThrow();

    expect(() =>
      assertValidUploadFile({
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: MAX_UPLOAD_FILE_SIZE_BYTES,
        header: JPEG,
      }),
    ).not.toThrow();
  });

  it('rejects files above 200 MB with the configured error message', () => {
    expect(uploadFileTooLargeMessage()).toBe(
      'File is too large. Maximum allowed size is 200 MB.',
    );
    expect(() =>
      assertValidUploadFile({
        originalname: 'huge.jpg',
        mimetype: 'image/jpeg',
        size: MAX_UPLOAD_FILE_SIZE_BYTES + 1,
        header: JPEG,
      }),
    ).toThrow(uploadFileTooLargeMessage());
  });

  it('limits each HTTP request to one original for RAM safety', () => {
    expect(MAX_UPLOAD_FILES_PER_REQUEST).toBe(1);
    expect(MAX_UPLOAD_FILE_SIZE_BYTES).toBe(200 * 1024 * 1024);
  });

  it('reads only a small header from disk instead of the full file', async () => {
    const dir = join(tmpdir(), 'dhara-gallery-header-test');
    mkdirSync(dir, { recursive: true });
    const path = join(dir, 'photo.jpg');
    const body = Buffer.concat([JPEG, Buffer.alloc(1024, 7)]);
    writeFileSync(path, body);

    const header = await readFileHeader(path);
    expect(header.length).toBeLessThanOrEqual(MAGIC_BYTE_HEADER_LENGTH);
    expect(detectImageMimeFromMagicBytes(header)).toBe('image/jpeg');
    expect(readFileSync(path).equals(body)).toBe(true);
    unlinkSync(path);
  });

  it('allows studio roles to view originals when client download is off', () => {
    expect(canAccessOriginalPhoto(['gallery.read'], false)).toBe(false);
    expect(canAccessOriginalPhoto(['gallery.read', 'gallery.create'], false)).toBe(true);
    expect(canAccessOriginalPhoto(['gallery.update'], false)).toBe(true);
    expect(canAccessOriginalPhoto(['gallery.archive'], false)).toBe(true);
  });

  it('allows originals for gallery.read when allowClientDownload is true', () => {
    expect(canAccessOriginalPhoto(['gallery.read'], true)).toBe(true);
  });
});
