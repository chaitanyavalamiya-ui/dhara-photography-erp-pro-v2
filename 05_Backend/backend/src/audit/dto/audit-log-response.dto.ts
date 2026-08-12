import { ApiProperty } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  module!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  recordType!: string;

  @ApiProperty()
  recordId!: string;

  @ApiProperty({ nullable: true })
  actorUserId!: string | null;

  @ApiProperty({ nullable: true })
  actorName!: string | null;

  @ApiProperty({ nullable: true })
  previousValue!: Record<string, unknown> | null;

  @ApiProperty({ nullable: true })
  newValue!: Record<string, unknown> | null;

  @ApiProperty({ nullable: true })
  ipAddress!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class PaginatedAuditLogsResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  items!: AuditLogResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
