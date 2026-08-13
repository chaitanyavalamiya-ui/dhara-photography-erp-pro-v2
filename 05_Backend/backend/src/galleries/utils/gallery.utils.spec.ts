import {
  assertValidUploadFile,
  canAccessOriginalPhoto,
  detectImageMimeFromMagicBytes,
  sanitizeFileName,
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
        buffer: Buffer.from('hello'),
      }),
    ).toThrow(/does not match/);
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
