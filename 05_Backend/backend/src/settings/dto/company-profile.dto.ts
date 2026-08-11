import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CompanyProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  isActive!: boolean;
}

export class UpdateCompanyProfileDto {
  @ApiProperty({ example: 'Dhara Photography Patan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}
