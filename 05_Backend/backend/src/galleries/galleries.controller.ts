import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { GalleriesService } from './galleries.service';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';
import { ListGalleriesQueryDto } from './dto/list-galleries-query.dto';
import { ListGalleryPhotosQueryDto } from './dto/list-gallery-photos-query.dto';
import {
  GalleryPhotoDto,
  GalleryResponseDto,
  PaginatedGalleriesResponseDto,
  PaginatedGalleryPhotosResponseDto,
} from './dto/gallery-response.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_UPLOAD_FILES,
  MAX_UPLOAD_FILE_SIZE_BYTES,
} from './utils/gallery.utils';

@ApiTags('Galleries')
@ApiBearerAuth()
@Controller('galleries')
export class GalleriesController {
  constructor(private readonly galleriesService: GalleriesService) {}

  @Get()
  @RequirePermissions('gallery.read')
  @ApiOperation({ summary: 'List galleries' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListGalleriesQueryDto,
  ): Promise<PaginatedGalleriesResponseDto> {
    return this.galleriesService.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions('gallery.read')
  @ApiOperation({ summary: 'Get gallery details' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<GalleryResponseDto> {
    return this.galleriesService.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions('gallery.create')
  @ApiOperation({ summary: 'Create gallery from booking' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateGalleryDto,
    @Req() req: Request,
  ): Promise<GalleryResponseDto> {
    return this.galleriesService.create(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':id')
  @RequirePermissions('gallery.update')
  @ApiOperation({ summary: 'Update gallery' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateGalleryDto,
    @Req() req: Request,
  ): Promise<GalleryResponseDto> {
    return this.galleriesService.update(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id')
  @RequirePermissions('gallery.archive')
  @ApiOperation({ summary: 'Archive gallery' })
  async archive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.galleriesService.archive(
      user.companyId,
      user.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get(':id/photos')
  @RequirePermissions('gallery.read')
  @ApiOperation({ summary: 'List gallery photos' })
  async listPhotos(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query() query: ListGalleryPhotosQueryDto,
  ): Promise<PaginatedGalleryPhotosResponseDto> {
    return this.galleriesService.listPhotos(user.companyId, id, query);
  }

  @Post(':id/photos')
  @RequirePermissions('gallery.update')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload photos to gallery' })
  @UseInterceptors(
    FilesInterceptor('files', MAX_UPLOAD_FILES, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
          callback(new Error(`Unsupported file type: ${file.originalname}`), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadPhotos(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ): Promise<GalleryPhotoDto[]> {
    return this.galleriesService.uploadPhotos(
      user.companyId,
      user.sub,
      id,
      files,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get(':galleryId/photos/:photoId/file')
  @RequirePermissions('gallery.read')
  @ApiOperation({ summary: 'Download/view photo file (authenticated)' })
  async getPhotoFile(
    @CurrentUser() user: JwtPayload,
    @Param('galleryId') galleryId: string,
    @Param('photoId') photoId: string,
    @Query('variant') variant: 'original' | 'thumbnail' = 'thumbnail',
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.galleriesService.getPhotoFile(
      user.companyId,
      galleryId,
      photoId,
      variant === 'original' ? 'original' : 'thumbnail',
      user.permissions,
    );

    const safeName = file.fileName.replace(/[\r\n"]/g, '_');
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(file.buffer);
  }

  @Delete(':galleryId/photos/:photoId')
  @RequirePermissions('gallery.update')
  @ApiOperation({ summary: 'Delete gallery photo' })
  async deletePhoto(
    @CurrentUser() user: JwtPayload,
    @Param('galleryId') galleryId: string,
    @Param('photoId') photoId: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.galleriesService.deletePhoto(
      user.companyId,
      user.sub,
      galleryId,
      photoId,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
