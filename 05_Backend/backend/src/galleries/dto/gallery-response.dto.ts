import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GalleryPhotoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  fileSize!: number;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  clientSelected!: boolean;

  @ApiPropertyOptional()
  clientSelectionNotes?: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class GalleryResponseDto {
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
  eventType?: string | null;

  @ApiPropertyOptional()
  eventDate?: string | null;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  allowClientDownload!: boolean;

  @ApiProperty()
  photoCount!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ type: [GalleryPhotoDto] })
  photos?: GalleryPhotoDto[];
}

export class PaginatedGalleriesResponseDto {
  @ApiProperty({ type: [GalleryResponseDto] })
  items!: GalleryResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
