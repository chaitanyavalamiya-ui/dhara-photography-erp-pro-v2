import { generateJpegThumbnail, THUMBNAIL_MAX_EDGE } from './thumbnail.utils';
import sharp from 'sharp';

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
});
