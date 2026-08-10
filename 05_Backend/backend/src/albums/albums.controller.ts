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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AlbumsService } from './albums.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { ListAlbumsQueryDto } from './dto/list-albums-query.dto';
import { ManageAlbumPhotosDto } from './dto/manage-album-photos.dto';
import {
  AlbumPhotoDto,
  AlbumResponseDto,
  PaginatedAlbumsResponseDto,
} from './dto/album-response.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Albums')
@ApiBearerAuth()
@Controller('albums')
export class AlbumsController {
  constructor(private readonly albumsService: AlbumsService) {}

  @Get()
  @RequirePermissions('album.read')
  @ApiOperation({ summary: 'List albums' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListAlbumsQueryDto,
  ): Promise<PaginatedAlbumsResponseDto> {
    return this.albumsService.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions('album.read')
  @ApiOperation({ summary: 'Get album details' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<AlbumResponseDto> {
    return this.albumsService.findOne(user.companyId, id, user.sub);
  }

  @Post()
  @RequirePermissions('album.create')
  @ApiOperation({ summary: 'Create album' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAlbumDto,
    @Req() req: Request,
  ): Promise<AlbumResponseDto> {
    return this.albumsService.create(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':id')
  @RequirePermissions('album.update')
  @ApiOperation({ summary: 'Update album' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAlbumDto,
    @Req() req: Request,
  ): Promise<AlbumResponseDto> {
    return this.albumsService.update(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id')
  @RequirePermissions('album.archive')
  @ApiOperation({ summary: 'Archive album' })
  async archive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.albumsService.archive(
      user.companyId,
      user.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get(':id/photos')
  @RequirePermissions('album.read')
  @ApiOperation({ summary: 'List selected album photos' })
  async listPhotos(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<AlbumPhotoDto[]> {
    return this.albumsService.listPhotos(user.companyId, id);
  }

  @Post(':id/photos')
  @RequirePermissions('album.update')
  @ApiOperation({ summary: 'Add gallery photos to album' })
  async addPhotos(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ManageAlbumPhotosDto,
    @Req() req: Request,
  ): Promise<AlbumPhotoDto[]> {
    return this.albumsService.addPhotos(
      user.companyId,
      user.sub,
      id,
      dto.galleryPhotoIds,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post(':id/photos/select-all')
  @RequirePermissions('album.update')
  @ApiOperation({ summary: 'Select all gallery photos for album' })
  async selectAllPhotos(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<AlbumPhotoDto[]> {
    return this.albumsService.selectAllPhotos(
      user.companyId,
      user.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id/photos')
  @RequirePermissions('album.update')
  @ApiOperation({ summary: 'Clear all selected album photos' })
  async clearAllPhotos(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.albumsService.clearAllPhotos(
      user.companyId,
      user.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id/photos/:galleryPhotoId')
  @RequirePermissions('album.update')
  @ApiOperation({ summary: 'Remove gallery photo from album' })
  async removePhoto(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('galleryPhotoId') galleryPhotoId: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.albumsService.removePhoto(
      user.companyId,
      user.sub,
      id,
      galleryPhotoId,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
