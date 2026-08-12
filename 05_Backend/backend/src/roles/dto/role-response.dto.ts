import { ApiProperty } from '@nestjs/swagger';

export class RoleSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  hierarchyRank!: number;

  @ApiProperty()
  isSystem!: boolean;

  @ApiProperty()
  permissionCount!: number;

  @ApiProperty()
  isEditable!: boolean;
}

export class PermissionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  module!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  group!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  isGranted!: boolean;
}

export class PermissionGroupDto {
  @ApiProperty()
  group!: string;

  @ApiProperty({ type: [PermissionItemDto] })
  permissions!: PermissionItemDto[];
}

export class RoleDetailDto extends RoleSummaryDto {
  @ApiProperty({ type: [PermissionGroupDto] })
  permissionGroups!: PermissionGroupDto[];

  @ApiProperty({ type: [String] })
  grantedPermissionCodes!: string[];
}
