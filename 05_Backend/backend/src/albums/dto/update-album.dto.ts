import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ALBUM_STATUS_CODES, ALBUM_TYPE_CODES } from '../utils/album.utils';

export class UpdateAlbumDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  galleryId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ALBUM_TYPE_CODES })
  @IsOptional()
  @IsIn([...ALBUM_TYPE_CODES])
  albumType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  albumPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  pageCount?: number;

  @ApiPropertyOptional({ enum: ALBUM_STATUS_CODES })
  @IsOptional()
  @IsIn([...ALBUM_STATUS_CODES])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedDeliveryDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actualDeliveryDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  vendorExpense?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}
