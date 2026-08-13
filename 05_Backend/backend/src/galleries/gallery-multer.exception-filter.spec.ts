import { HttpStatus } from '@nestjs/common';
import { MulterError } from 'multer';
import { GalleryMulterExceptionFilter } from './gallery-multer.exception-filter';
import { uploadFileTooLargeMessage } from './utils/gallery.utils';

describe('GalleryMulterExceptionFilter', () => {
  const filter = new GalleryMulterExceptionFilter();

  it('maps LIMIT_FILE_SIZE to the configured 200 MB message', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status, json }),
        getRequest: () => ({ url: '/api/v1/galleries/g1/photos' }),
      }),
    } as never;

    filter.catch(new MulterError('LIMIT_FILE_SIZE'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: uploadFileTooLargeMessage(),
      }),
    );
    expect(uploadFileTooLargeMessage()).toBe('File is too large. Maximum allowed size is 200 MB.');
  });
});
