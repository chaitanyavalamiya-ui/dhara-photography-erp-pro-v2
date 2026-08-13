import { ApiProperty } from '@nestjs/swagger';

export class UserRoleSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isPrimary!: boolean;
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: [UserRoleSummaryDto] })
  roles!: UserRoleSummaryDto[];

  @ApiProperty({ nullable: true })
  lastLoginAt!: string | null;

  @ApiProperty()
  failedLoginAttempts!: number;

  @ApiProperty({ nullable: true })
  lockedUntil!: string | null;

  @ApiProperty()
  isLocked!: boolean;

  @ApiProperty()
  createdAt!: string;
}

export class UserDetailResponseDto extends UserResponseDto {}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  items!: UserResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class RoleOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  hierarchyRank!: number;
}
