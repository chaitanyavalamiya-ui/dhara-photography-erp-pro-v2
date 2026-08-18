import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MasterDataItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'expense_category' })
  category!: string;

  @ApiProperty({ example: 'travel' })
  code!: string;

  @ApiProperty({ example: 'Travel' })
  label!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  updatedAt!: string;
}

export const MANAGEABLE_MASTER_DATA_CATEGORIES = [
  'expense_category',
  'payment_mode',
  'equipment_category',
] as const;

export type ManageableMasterDataCategory =
  (typeof MANAGEABLE_MASTER_DATA_CATEGORIES)[number];
