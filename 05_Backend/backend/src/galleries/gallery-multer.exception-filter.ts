import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MulterError } from 'multer';
import { uploadFileTooLargeMessage } from './utils/gallery.utils';

@Catch(MulterError)
export class GalleryMulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const message =
      exception.code === 'LIMIT_FILE_SIZE'
        ? uploadFileTooLargeMessage()
        : exception.message;

    response.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
