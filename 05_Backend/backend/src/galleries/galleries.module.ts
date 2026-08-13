import { Module } from '@nestjs/common';
import { GalleriesController } from './galleries.controller';
import { GalleriesService } from './galleries.service';
import { CleanupMulterTempFilesInterceptor } from './cleanup-multer-temp-files.interceptor';

@Module({
  controllers: [GalleriesController],
  providers: [GalleriesService, CleanupMulterTempFilesInterceptor],
  exports: [GalleriesService],
})
export class GalleriesModule {}
