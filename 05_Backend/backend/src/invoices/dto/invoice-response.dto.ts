import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvoiceClientDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  mobile!: string;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiPropertyOptional()
  city?: string | null;
}

export class InvoiceBookingItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unit!: string;

  @ApiProperty()
  rate!: number;

  @ApiProperty()
  days!: number;

  @ApiProperty()
  amount!: number;
}

export class InvoiceBookingDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  bookingNumber!: string;

  @ApiProperty()
  eventType!: string;

  @ApiPropertyOptional()
  eventDate?: string | null;

  @ApiPropertyOptional()
  eventEndDate?: string | null;

  @ApiPropertyOptional()
  venue?: string | null;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty({ type: [InvoiceBookingItemDto] })
  items!: InvoiceBookingItemDto[];
}

export class InvoiceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  invoiceNumber!: string;

  @ApiProperty()
  bookingId!: string;

  @ApiProperty()
  clientId!: string;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  discount!: number;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  advanceAmount!: number;

  @ApiProperty()
  balanceAmount!: number;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  invoiceDate!: string;

  @ApiPropertyOptional()
  dueDate?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty()
  client!: InvoiceClientDto;

  @ApiProperty()
  booking!: InvoiceBookingDto;
}

export class InvoiceListItemDto {
  @ApiProperty()
  id!: string;

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
  eventType!: string;

  @ApiPropertyOptional()
  eventDate?: string | null;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  advanceAmount!: number;

  @ApiProperty()
  balanceAmount!: number;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  invoiceDate!: string;

  @ApiPropertyOptional()
  dueDate?: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class PaginatedInvoicesResponseDto {
  @ApiProperty({ type: [InvoiceListItemDto] })
  items!: InvoiceListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
