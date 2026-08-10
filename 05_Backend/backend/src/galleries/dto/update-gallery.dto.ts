import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { GALLERY_STATUS_CODES } from '../utils/gallery.utils';

export class UpdateGalleryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ enum: GALLERY_STATUS_CODES })
  @IsOptional()
  @IsIn([...GALLERY_STATUS_CODES])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowClientDownload?: boolean;
}
