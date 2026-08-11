import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { MANAGEABLE_MASTER_DATA_CATEGORIES } from './master-data-response.dto';

export class CreateMasterDataDto {
  @ApiProperty({ enum: MANAGEABLE_MASTER_DATA_CATEGORIES })
  @IsString()
  @IsIn([...MANAGEABLE_MASTER_DATA_CATEGORIES])
  category!: string;

  @ApiProperty({ example: 'studio_rent' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'Code must use lowercase letters, numbers, and underscores.',
  })
  code!: string;

  @ApiProperty({ example: 'Studio Rent' })
  @IsString()
  @MaxLength(100)
  label!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
