import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { MANAGEABLE_MASTER_DATA_CATEGORIES } from './master-data-response.dto';

export class ListMasterDataQueryDto {
  @ApiProperty({ enum: MANAGEABLE_MASTER_DATA_CATEGORIES })
  @IsString()
  @IsIn([...MANAGEABLE_MASTER_DATA_CATEGORIES])
  category!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactive?: boolean;
}
