import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/is-strong-password.decorator';

export class CreateUserDto {
  @ApiProperty({ example: 'Studio Manager' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName!: string;

  @ApiProperty({ example: 'manager@dharaphotography.local' })
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @IsStrongPassword()
  @MaxLength(100)
  password!: string;

  @ApiProperty({ type: [String], description: 'Role IDs to assign' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  roleIds!: string[];
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Studio Manager' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName?: string;

  @ApiPropertyOptional({ example: 'manager@dharaphotography.local' })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ example: 'SecurePass123!' })
  @ValidateIf((dto: UpdateUserDto) => Boolean(dto.password))
  @IsString()
  @IsStrongPassword()
  @MaxLength(100)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  roleIds?: string[];
}
