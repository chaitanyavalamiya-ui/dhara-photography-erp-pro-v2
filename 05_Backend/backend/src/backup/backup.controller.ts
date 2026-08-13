import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { BackupService } from './backup.service';
import { PreviewRestoreDto, RestoreBackupDto, UpdateBackupLocationDto } from './dto/backup.dto';

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

  @Post('restore')
  @RequirePermissions('settings.update')
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
