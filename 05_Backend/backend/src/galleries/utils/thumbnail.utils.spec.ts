import { generateJpegThumbnail, generateJpegThumbnailFromPath, THUMBNAIL_MAX_EDGE } from './thumbnail.utils';
import sharp from 'sharp';
import { mkdtempSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('thumbnail.utils', () => {
  it('creates a smaller JPEG without mutating the original buffer', async () => {
    const original = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 120, g: 40, b: 40 } },
    })
      .jpeg()
      .toBuffer();

    const copy = Buffer.from(original);
    const thumbnail = await generateJpegThumbnail(original);

    expect(original.equals(copy)).toBe(true);
    expect(thumbnail.length).toBeGreaterThan(0);
    expect(thumbnail.length).toBeLessThan(original.length);

    const meta = await sharp(thumbnail).metadata();
    expect(meta.format).toBe('jpeg');
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(THUMBNAIL_MAX_EDGE);
  });

  it('generates a thumbnail from a disk path without changing the original file', async () => {
    const original = await sharp({
      create: { width: 640, height: 480, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .jpeg({ quality: 95 })
      .toBuffer();

    const dir = mkdtempSync(join(tmpdir(), 'dhara-thumb-'));
    const path = join(dir, 'original.jpg');
    writeFileSync(path, original);

    const thumbnail = await generateJpegThumbnailFromPath(path);
    expect(readFileSync(path).equals(original)).toBe(true);
    expect(thumbnail.length).toBeLessThan(original.length);
  });
});
