import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ALBUM_STATUS_CODES, ALBUM_TYPE_CODES } from '../utils/album.utils';

export class CreateAlbumDto {
  @ApiProperty()
  @IsUUID()
  bookingId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  galleryId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

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
  orderDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actualDeliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  vendorExpense?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
