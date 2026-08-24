import { CallHandler } from '@nestjs/common';
import { StreamableFile } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor();

  it('wraps JSON payloads in the API envelope', (done) => {
    interceptor
      .intercept({} as never, { handle: () => of({ ok: true }) } as CallHandler)
      .subscribe((value) => {
        expect(value).toEqual({
          success: true,
          message: 'Operation completed successfully.',
          data: { ok: true },
        });
        done();
      });
  });

  it('does not wrap StreamableFile downloads', (done) => {
    const file = new StreamableFile(Buffer.from('zip'));
    interceptor
      .intercept({} as never, { handle: () => of(file) } as CallHandler)
      .subscribe((value) => {
        expect(value).toBe(file);
        done();
      });
  });
});
