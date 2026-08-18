import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EquipmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  trackingType!: string;

  @ApiPropertyOptional()
  serialNumber?: string | null;

  @ApiProperty()
  totalQuantity!: number;

  @ApiProperty()
  availableQuantity!: number;

  @ApiProperty()
  onShootQuantity!: number;

  @ApiProperty()
  missingQuantity!: number;

  @ApiProperty()
  underRepairQuantity!: number;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  condition!: string;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  specifications?: Record<string, string | number> | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class PaginatedEquipmentResponseDto {
  @ApiProperty({ type: [EquipmentResponseDto] })
  items!: EquipmentResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class EquipmentHistoryRowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  quantity!: number;

  @ApiPropertyOptional()
  conditionOut?: string | null;

  @ApiPropertyOptional()
  conditionIn?: string | null;

  @ApiPropertyOptional()
  bookingNumber?: string | null;

  @ApiPropertyOptional()
  staffName?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  occurredAt!: string;
}

export class EquipmentDetailResponseDto extends EquipmentResponseDto {
  @ApiProperty({ type: [EquipmentHistoryRowDto] })
  history!: EquipmentHistoryRowDto[];
}

export class EquipmentIssueItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  equipmentId!: string;

  @ApiProperty()
  equipmentName!: string;

  @ApiProperty()
  equipmentCode!: string;

  @ApiProperty()
  category!: string;

  @ApiPropertyOptional()
  serialNumber?: string | null;

  @ApiProperty()
  quantityIssued!: number;

  @ApiProperty()
  quantityReturned!: number;

  @ApiProperty()
  missingQuantity!: number;

  @ApiProperty()
  damagedQuantity!: number;

  @ApiProperty()
  conditionOut!: string;

  @ApiPropertyOptional()
  conditionIn?: string | null;

  @ApiProperty()
  returnStatus!: string;

  @ApiPropertyOptional()
  notes?: string | null;
}

export class EquipmentIssueSummaryDto {
  @ApiProperty()
  totalIssued!: number;

  @ApiProperty()
  totalReturned!: number;

  @ApiProperty()
  totalMissing!: number;

  @ApiProperty()
  totalDamaged!: number;
}

export class EquipmentIssueResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  issueNumber!: string;

  @ApiProperty()
  bookingId!: string;

  @ApiProperty()
  bookingNumber!: string;

  @ApiProperty()
  clientName!: string;

  @ApiPropertyOptional()
  eventType?: string | null;

  @ApiPropertyOptional()
  eventDate?: string | null;

  @ApiProperty()
  staffId!: string;

  @ApiProperty()
  staffName!: string;

  @ApiProperty()
  issuedAt!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty({ type: [EquipmentIssueItemDto] })
  items!: EquipmentIssueItemDto[];

  @ApiProperty({ type: EquipmentIssueSummaryDto })
  summary!: EquipmentIssueSummaryDto;
}

export class EquipmentDashboardDto {
  @ApiProperty()
  onShoot!: number;

  @ApiProperty()
  withStaff!: number;

  @ApiProperty()
  missing!: number;

  @ApiProperty()
  damaged!: number;

  @ApiProperty()
  underRepair!: number;

  @ApiProperty()
  available!: number;
}

export class StaffEquipmentSummaryDto {
  @ApiProperty()
  staffId!: string;

  @ApiProperty()
  staffName!: string;

  @ApiProperty()
  totalIssues!: number;

  @ApiProperty()
  currentlyHolding!: number;

  @ApiProperty()
  returned!: number;

  @ApiProperty()
  missing!: number;

  @ApiProperty()
  damaged!: number;

  @ApiProperty({ type: [EquipmentIssueResponseDto] })
  issues!: EquipmentIssueResponseDto[];
}

export class BookingEquipmentUsedDto {
  @ApiProperty()
  category!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  quantity!: number;
}

export class BookingEquipmentOverviewDto {
  @ApiProperty({ type: [BookingEquipmentUsedDto] })
  used!: BookingEquipmentUsedDto[];

  @ApiProperty({ type: EquipmentIssueSummaryDto })
  summary!: EquipmentIssueSummaryDto;

  @ApiProperty({ type: [EquipmentIssueResponseDto] })
  issues!: EquipmentIssueResponseDto[];
}
