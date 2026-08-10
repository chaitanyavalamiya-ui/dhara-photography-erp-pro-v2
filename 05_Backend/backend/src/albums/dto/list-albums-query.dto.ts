import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ALBUM_STATUS_CODES, ALBUM_TYPE_CODES } from '../utils/album.utils';

export class ListAlbumsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ enum: [...ALBUM_STATUS_CODES, 'all'] })
  @IsOptional()
  @IsIn([...ALBUM_STATUS_CODES, 'all'])
  status?: string = 'all';

  @ApiPropertyOptional({ enum: [...ALBUM_TYPE_CODES, 'all'] })
  @IsOptional()
  @IsIn([...ALBUM_TYPE_CODES, 'all'])
  albumType?: string = 'all';

  @ApiPropertyOptional({ enum: ['createdAt', 'orderDate', 'name', 'expectedDeliveryDate'], default: 'createdAt' })
  @IsOptional()
  @IsIn(['createdAt', 'orderDate', 'name', 'expectedDeliveryDate'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
