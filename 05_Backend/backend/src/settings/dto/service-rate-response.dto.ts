import { ApiProperty } from '@nestjs/swagger';

export class SettingsServiceRateDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  defaultRate!: number;

  @ApiProperty()
  unit!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  updatedAt!: string;
}
