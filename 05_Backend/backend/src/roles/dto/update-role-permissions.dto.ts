import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class UpdateRolePermissionsDto {
  @ApiProperty({ type: [String], example: ['clients.read', 'clients.create'] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionCodes!: string[];
}
