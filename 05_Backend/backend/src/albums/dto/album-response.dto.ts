import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AlbumPhotoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  galleryPhotoId!: string;

  @ApiProperty()
  galleryId!: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  available!: boolean;

  @ApiProperty()
  createdAt!: string;
}

export class AlbumResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  clientId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty()
  bookingId!: string;

  @ApiProperty()
  bookingNumber!: string;

  @ApiPropertyOptional()
  galleryId?: string | null;

  @ApiPropertyOptional()
  galleryName?: string | null;

  @ApiProperty()
  galleryArchived!: boolean;

  @ApiProperty()
  albumType!: string;

  @ApiProperty()
  albumPrice!: number;

  @ApiProperty()
  pageCount!: number;

  @ApiProperty()
  selectedPhotoCount!: number;

  @ApiProperty()
  vendorExpense!: number;

  @ApiPropertyOptional()
  vendorExpenseId?: string | null;

  @ApiProperty()
  profit!: number;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  orderDate?: string | null;

  @ApiPropertyOptional()
  expectedDeliveryDate?: string | null;

  @ApiPropertyOptional()
  actualDeliveryDate?: string | null;

  @ApiPropertyOptional()
  vendorName?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ type: [AlbumPhotoDto] })
  photos?: AlbumPhotoDto[];
}

export class PaginatedAlbumsResponseDto {
  @ApiProperty({ type: [AlbumResponseDto] })
  items!: AlbumResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
