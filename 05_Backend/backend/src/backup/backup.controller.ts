import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { createReadStream } from 'fs';
import { basename } from 'path';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { BackupService } from './backup.service';
import { createBackupUploadMulterOptions } from './backup-upload.multer';
import {
  DownloadBackupQueryDto,
  PreviewRestoreDto,
  RestoreBackupDto,
  UpdateBackupLocationDto,
} from './dto/backup.dto';

@ApiTags('Backup')
@ApiBearerAuth()
@Controller('settings/backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('location')
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'Get the configured local backup folder' })
  getLocation() {
    return this.backupService.getLocation();
  }

  @Patch('location')
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Change the local backup folder' })
  setLocation(@Body() dto: UpdateBackupLocationDto) {
    return this.backupService.setLocation(dto.backupDir);
  }

  @Get('history')
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'List backup ZIP files in the backup folder' })
  listHistory() {
    return { items: this.backupService.listHistory() };
  }

  @Get('download')
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Download a backup ZIP from the backup folder' })
  download(@Query() query: DownloadBackupQueryDto): StreamableFile {
    const filePath = this.backupService.getDownloadPath(query.backupFile);
    const safeName = basename(filePath).replace(/[\r\n"]/g, '_');
    return new StreamableFile(createReadStream(filePath), {
      type: 'application/zip',
      disposition: `attachment; filename="${safeName}"`,
    });
  }

  @Post()
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Create a full local backup now' })
  async createBackup(@CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.backupService.createBackup(user.companyId, user.sub, req.ip);
  }

  @Post('restore/preview')
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Validate a backup ZIP without changing data' })
  previewRestore(@Body() dto: PreviewRestoreDto) {
    return this.backupService.previewRestore(dto.backupFile);
  }

  @Post('restore/browse')
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Open a local file picker for a backup ZIP' })
  browseBackupFile() {
    return this.backupService.browseBackupFile();
  }

  @Post('restore/upload')
  @RequirePermissions('settings.update', 'roles.manage')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', createBackupUploadMulterOptions()))
  @ApiOperation({ summary: 'Upload a backup ZIP into the backup folder for restore preview' })
  uploadRestoreFile(@UploadedFile() file: Express.Multer.File) {
    return this.backupService.saveUploadedBackup(file);
  }

  @Post('restore')
  @RequirePermissions('settings.update', 'roles.manage')
  @ApiOperation({ summary: 'Replace ERP data from a validated backup ZIP' })
  restore(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RestoreBackupDto,
    @Req() req: Request,
  ) {
    return this.backupService.restoreBackup(
      user.companyId,
      user.sub,
      dto.backupFile,
      dto.confirmPhrase,
      req.ip,
    );
  }
}
