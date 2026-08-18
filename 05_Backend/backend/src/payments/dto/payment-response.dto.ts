import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  receiptNumber?: string | null;

  @ApiProperty()
  invoiceId!: string;

  @ApiProperty()
  invoiceNumber!: string;

  @ApiProperty()
  bookingId!: string;

  @ApiProperty()
  bookingNumber!: string;

  @ApiProperty()
  clientId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty()
  clientMobile!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  paymentDate!: string;

  @ApiProperty()
  paymentModeCode!: string;

  @ApiProperty()
  paymentModeLabel!: string;

  @ApiPropertyOptional()
  transactionReference?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  previousBalance?: number;

  @ApiPropertyOptional()
  remainingBalance?: number;

  @ApiPropertyOptional()
  createdByName?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  isVoided!: boolean;

  @ApiPropertyOptional()
  voidedAt?: string | null;
}

export class PaginatedPaymentsResponseDto {
  @ApiProperty({ type: [PaymentResponseDto] })
  items!: PaymentResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
