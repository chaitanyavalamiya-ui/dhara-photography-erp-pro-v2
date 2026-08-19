import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'DHARA-PATAN' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  companyCode!: string;

  @ApiProperty({ example: 'admin@dharaphotography.local' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'your-dev-password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
