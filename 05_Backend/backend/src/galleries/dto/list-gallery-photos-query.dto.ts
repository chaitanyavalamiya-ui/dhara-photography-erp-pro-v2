import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { GALLERY_PHOTO_PAGE_DEFAULT, GALLERY_PHOTO_PAGE_MAX } from '../utils/gallery.utils';

export class ListGalleryPhotosQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: GALLERY_PHOTO_PAGE_DEFAULT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(GALLERY_PHOTO_PAGE_MAX)
  limit?: number = GALLERY_PHOTO_PAGE_DEFAULT;
}
