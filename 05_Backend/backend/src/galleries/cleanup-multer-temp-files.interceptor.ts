import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class CleanupMulterTempFilesInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      files?: Express.Multer.File[];
      file?: Express.Multer.File;
    }>();

    return next.handle().pipe(
      finalize(() => {
        const files = request.files ?? (request.file ? [request.file] : []);
        for (const file of files) {
          if (file?.path) {
            void unlink(file.path).catch(() => undefined);
          }
        }
      }),
    );
  }
}
