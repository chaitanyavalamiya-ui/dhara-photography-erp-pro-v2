import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PackageItemDto {
  @ApiProperty()
  @IsUUID()
  serviceRateId!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  days?: number;
}

export class CreatePackageDto {
  @ApiProperty({ example: 'wedding_premium' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'Code must use lowercase letters, numbers, and underscores.',
  })
  code!: string;

  @ApiProperty({ example: 'Premium Wedding Package' })
  @IsString()
  @MaxLength(100)
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 85000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultPrice!: number;

  @ApiPropertyOptional({ example: 75000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offerPrice?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ type: [PackageItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PackageItemDto)
  items!: PackageItemDto[];
}

export class UpdatePackageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offerPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [PackageItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PackageItemDto)
  items?: PackageItemDto[];
}

export class PackageItemResponseDto {
  @ApiProperty()
  serviceRateId!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  unit!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  days!: number;
}

export class PackageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  defaultPrice!: number;

  @ApiProperty({ nullable: true })
  offerPrice!: number | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: [PackageItemResponseDto] })
  items!: PackageItemResponseDto[];

  @ApiProperty()
  updatedAt!: string;
}
